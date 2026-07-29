import { useState, useEffect } from "react";
import * as bookingService from "../../services/collaboration/bookingService";
import { getSocket } from "../../services/collaboration/socket";

export const useBookings = (groupId: string | undefined) => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = async () => {
    if (!groupId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await bookingService.getBookings(groupId);
      setBookings(data);
    } catch (err: any) {
      setError(err.message || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const addBooking = async (
    bookingReference: string,
    bookingType: string,
    amount: number,
    status: string
  ) => {
    if (!groupId) return;
    try {
      return await bookingService.createBookingRecord(
        groupId,
        bookingReference,
        bookingType,
        amount,
        status
      );
    } catch (err: any) {
      throw new Error(err.message || "Failed to add booking");
    }
  };

  const updateBooking = async (
    id: string,
    bookingReference: string,
    bookingType: string,
    amount: number,
    status: string
  ) => {
    if (!groupId) return;
    try {
      return await bookingService.updateBooking(id, groupId, bookingReference, bookingType, amount, status);
    } catch (err: any) {
      throw new Error(err.message || "Failed to update booking");
    }
  };

  const deleteBooking = async (id: string) => {
    if (!groupId) return;
    try {
      await bookingService.deleteBooking(id, groupId);
    } catch (err: any) {
      throw new Error(err.message || "Failed to delete booking");
    }
  };

  useEffect(() => {
    if (!groupId) return;

    fetchBookings();

    const socket = getSocket();
    socket.emit("group:join", groupId);

    const handleCreated = (newBooking: any) => {
      setBookings(prev => {
        if (prev.find(b => b.id === newBooking.id)) return prev;
        return [newBooking, ...prev];
      });
    };

    const handleUpdated = (updatedBooking: any) => {
      setBookings(prev => {
        if (updatedBooking.deleted) {
          return prev.filter(b => b.id !== updatedBooking.id);
        }
        const index = prev.findIndex(b => b.id === updatedBooking.id);
        if (index === -1) return prev;
        const updated = [...prev];
        updated[index] = updatedBooking;
        return updated;
      });
    };

    socket.on("booking:created", handleCreated);
    socket.on("booking:updated", handleUpdated);

    return () => {
      socket.off("booking:created", handleCreated);
      socket.off("booking:updated", handleUpdated);
    };
  }, [groupId]);

  return { bookings, loading, error, fetchBookings, addBooking, updateBooking, deleteBooking };
};
