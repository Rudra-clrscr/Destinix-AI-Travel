import React, { useState } from "react";
import { useBookings } from "../../hooks/collaboration/useBookings";
import { formatCurrency } from "../../utils/currency";
import { Plus, Plane, Hotel, Car, Shield, Link, Check, X, FileText, Loader2, Edit2, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SharedBookingsProps {
  groupId: string;
  userRole: string; // "OWNER" | "EDITOR" | "VIEWER"
}

export const SharedBookings: React.FC<SharedBookingsProps> = ({ groupId, userRole }) => {
  const { bookings, loading, addBooking, updateBooking, deleteBooking } = useBookings(groupId);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [reference, setReference] = useState("");
  const [type, setType] = useState("Flight");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("Confirmed");

  // Edit states
  const [editingBooking, setEditingBooking] = useState<any | null>(null);
  const [editReference, setEditReference] = useState("");
  const [editType, setEditType] = useState("Flight");
  const [editAmount, setEditAmount] = useState("");
  const [editStatus, setEditStatus] = useState("Confirmed");
  const [savingEdit, setSavingEdit] = useState(false);

  const canEdit = userRole === "OWNER" || userRole === "EDITOR";

  const getBookingIcon = (bookingType: string) => {
    switch (bookingType.toLowerCase()) {
      case "flight":
        return <Plane className="w-5 h-5 text-indigo-400" />;
      case "hotel":
        return <Hotel className="w-5 h-5 text-indigo-400" />;
      case "cab":
      case "car":
      case "rental":
      case "transport":
        return <Car className="w-5 h-5 text-indigo-400" />;
      case "insurance":
        return <Shield className="w-5 h-5 text-indigo-400" />;
      default:
        return <FileText className="w-5 h-5 text-indigo-400" />;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reference.trim() || !amount.trim() || !canEdit) return;

    setSubmitting(true);
    try {
      await addBooking(reference.trim(), type, Number(amount), status);
      setReference("");
      setAmount("");
      setType("Flight");
      setStatus("Confirmed");
      setShowForm(false);
    } catch (err) {
      alert("Failed to record booking");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (booking: any) => {
    setEditingBooking(booking);
    setEditReference(booking.bookingReference);
    setEditType(booking.bookingType);
    setEditAmount(String(booking.amount));
    setEditStatus(booking.status);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking || !editReference.trim() || !editAmount.trim() || !canEdit || savingEdit) return;

    setSavingEdit(true);
    try {
      await updateBooking(editingBooking.id, editReference.trim(), editType, Number(editAmount), editStatus);
      setEditingBooking(null);
    } catch (err) {
      alert("Failed to update booking");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (bookingId: string) => {
    if (!canEdit || !window.confirm("Are you sure you want to delete this booking?")) return;
    try {
      await deleteBooking(bookingId);
    } catch (err) {
      alert("Failed to delete booking");
    }
  };

  return (
    <div className="space-y-8 animate-[fadeIn_0.4s_ease-out]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-serif font-bold text-white mb-2">Shared Bookings & Reservations</h2>
          <p className="text-gray-400">Track mutual booking receipts, flights, hotels, and reference keys.</p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] px-6 py-3.5 rounded-xl font-bold transition-all text-white text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Record Booking</span>
          </button>
        )}
      </div>

      {/* Record Form Overlay */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-[#0d1117]/90 border border-white/10 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl z-10"
            >
              <h3 className="text-2xl font-bold text-white mb-6">Record Shared Booking</h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Booking Reference / PNR</label>
                  <input
                    type="text"
                    required
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="e.g. EK123456, GHT7894"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-gray-600 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Booking Type</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm appearance-none cursor-pointer"
                    >
                      <option className="bg-gray-900" value="Flight">Flight</option>
                      <option className="bg-gray-900" value="Hotel">Hotel</option>
                      <option className="bg-gray-900" value="Car">Car Rental</option>
                      <option className="bg-gray-900" value="Insurance">Insurance</option>
                      <option className="bg-gray-900" value="Other">Other Ticket</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Amount (INR)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="e.g. 15000"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-gray-600 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm appearance-none cursor-pointer"
                  >
                    <option className="bg-gray-900" value="Confirmed">Confirmed</option>
                    <option className="bg-gray-900" value="Pending">Pending</option>
                    <option className="bg-gray-900" value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-5 py-3 rounded-xl text-sm font-bold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 transition-all border border-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-3 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all flex items-center space-x-1"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>Record</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Booking Overlay */}
      <AnimatePresence>
        {editingBooking && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingBooking(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-[#0d1117]/90 border border-white/10 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl z-10"
            >
              <h3 className="text-2xl font-bold text-white mb-6">Edit Shared Booking</h3>
              <form onSubmit={handleEditSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Booking Reference / PNR</label>
                  <input
                    type="text"
                    required
                    value={editReference}
                    onChange={(e) => setEditReference(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-gray-600 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Booking Type</label>
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm appearance-none cursor-pointer"
                    >
                      <option className="bg-gray-900" value="Flight">Flight</option>
                      <option className="bg-gray-900" value="Hotel">Hotel</option>
                      <option className="bg-gray-900" value="Car">Car Rental</option>
                      <option className="bg-gray-900" value="Insurance">Insurance</option>
                      <option className="bg-gray-900" value="Other">Other Ticket</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Amount (INR)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-gray-600 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm appearance-none cursor-pointer"
                  >
                    <option className="bg-gray-900" value="Confirmed">Confirmed</option>
                    <option className="bg-gray-900" value="Pending">Pending</option>
                    <option className="bg-gray-900" value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingBooking(null)}
                    className="px-5 py-3 rounded-xl text-sm font-bold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 transition-all border border-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="px-6 py-3 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all flex items-center space-x-1"
                  >
                    {savingEdit ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bookings List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-32 bg-white/5 border border-white/10 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : bookings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {bookings.map((booking, idx) => (
            <motion.div
              key={booking.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white/5 border border-white/10 rounded-[32px] p-6 backdrop-blur-xl hover:border-indigo-500/20 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20">
                    {getBookingIcon(booking.bookingType)}
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block mb-1">
                      {booking.bookingType} PNR
                    </span>
                    <h3 className="text-xl font-bold text-white font-mono flex items-center gap-1.5">
                      {booking.bookingReference}
                    </h3>
                    <p className="text-xs text-gray-500 mt-2">
                      Recorded on {new Date(booking.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end justify-between h-full min-h-[70px]">
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                    booking.status === "Confirmed"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : booking.status === "Cancelled"
                      ? "bg-red-500/10 text-red-400 border border-red-500/20"
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  }`}>
                    {booking.status}
                  </span>
                  
                  <span className="text-lg font-bold text-white font-mono mt-3">
                    {formatCurrency(booking.amount, "INR")}
                  </span>

                  {canEdit && (
                    <div className="flex items-center space-x-2 mt-3">
                      <button
                        onClick={() => handleStartEdit(booking)}
                        className="p-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:border-indigo-500/30 hover:bg-white/10 transition-all"
                        title="Edit booking"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(booking.id)}
                        className="p-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5 transition-all"
                        title="Delete booking"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="py-24 bg-white/5 border border-white/10 border-dashed rounded-[32px] text-center max-w-2xl mx-auto flex flex-col items-center">
          <Plane className="w-10 h-10 text-gray-600 mb-4" />
          <h4 className="text-lg font-bold text-white mb-1">No bookings recorded</h4>
          <p className="text-sm text-gray-500 max-w-xs mb-6">
            {canEdit
              ? "Share flight references, hotel reservations, or event tickets with your team."
              : "No booking references have been shared by the team yet."}
          </p>
        </div>
      )}
    </div>
  );
};
export default SharedBookings;
