import { Response } from "express";
import { BookingService } from "../services/bookingService";

export class BookingController {
  static async createBookingRecord(req: any, res: Response) {
    try {
      const groupId = req.params.id;
      const { bookingReference, bookingType, amount, status } = req.body;

      const booking = await BookingService.createBookingRecord(
        groupId,
        bookingReference,
        bookingType,
        Number(amount),
        status
      );

      if (req.io) {
        req.io.to(groupId).emit("booking:created", booking);
      }

      return res.status(201).json(booking);
    } catch (error: any) {
      console.error("Create booking record error:", error);
      return res.status(500).json({ error: error.message || "Failed to create booking record" });
    }
  }

  static async getBookings(req: any, res: Response) {
    try {
      const groupId = req.params.id;
      const bookings = await BookingService.getBookings(groupId);
      return res.json(bookings);
    } catch (error: any) {
      console.error("Get bookings error:", error);
      return res.status(500).json({ error: error.message || "Failed to fetch bookings" });
    }
  }

  static async updateBooking(req: any, res: Response) {
    try {
      const bookingId = req.params.id;
      const { bookingReference, bookingType, amount, status, tripGroupId } = req.body;

      const booking = await BookingService.updateBooking(
        bookingId,
        bookingReference,
        bookingType,
        Number(amount),
        status
      );

      if (req.io && tripGroupId) {
        req.io.to(tripGroupId).emit("booking:updated", booking);
      }

      return res.json(booking);
    } catch (error: any) {
      console.error("Update booking error:", error);
      return res.status(500).json({ error: error.message || "Failed to update booking" });
    }
  }

  static async deleteBooking(req: any, res: Response) {
    try {
      const bookingId = req.params.id;
      const { tripGroupId } = req.query;

      await BookingService.deleteBooking(bookingId);

      if (req.io && tripGroupId) {
        req.io.to(tripGroupId as string).emit("booking:updated", { id: bookingId, deleted: true });
      }

      return res.json({ success: true, message: "Booking deleted" });
    } catch (error: any) {
      console.error("Delete booking error:", error);
      return res.status(500).json({ error: error.message || "Failed to delete booking" });
    }
  }
}
