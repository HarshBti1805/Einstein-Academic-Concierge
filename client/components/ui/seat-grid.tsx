"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SeatGridProps {
  totalSeats: number;
  occupiedSeats: number[];
  selectedSeats: number[];
  onSeatClick: (seatNumber: number) => void;
  seatsPerRow?: number;
  className?: string;
}

export function SeatGrid({
  totalSeats,
  occupiedSeats,
  selectedSeats,
  onSeatClick,
  seatsPerRow = 20,
  className,
}: SeatGridProps) {
  const totalRows = Math.ceil(totalSeats / seatsPerRow);
  const aisleAfterSeats = [5, 14]; // Aisles after seat 5 and 14 in each row
  
  const getSeatStatus = (seatNumber: number): "available" | "occupied" | "selected" => {
    if (selectedSeats.includes(seatNumber)) return "selected";
    if (occupiedSeats.includes(seatNumber)) return "occupied";
    return "available";
  };

  const getRowLabel = (rowIndex: number): string => {
    return String.fromCharCode(65 + rowIndex);
  };

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      {/* Screen */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-4xl"
      >
        <div className="screen-curve" />
        <div className="text-center text-xs text-zinc-500 mt-2 font-medium">
          SCREEN
        </div>
      </motion.div>

      {/* Seat Grid */}
      <div className="mt-8 flex flex-col gap-2">
        {Array.from({ length: totalRows }, (_, rowIndex) => {
          const startSeat = rowIndex * seatsPerRow + 1;
          const endSeat = Math.min((rowIndex + 1) * seatsPerRow, totalSeats);
          const seatsInRow = endSeat - startSeat + 1;

          return (
            <motion.div
              key={rowIndex}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: rowIndex * 0.03, duration: 0.3 }}
              className="flex items-center gap-1"
            >
              {/* Row Label */}
              <div className="w-6 text-xs font-semibold text-zinc-500 text-right mr-2">
                {getRowLabel(rowIndex)}
              </div>

              {/* Seats */}
              <div className="flex items-center gap-1">
                {Array.from({ length: seatsInRow }, (_, colIndex) => {
                  const seatNumber = startSeat + colIndex;
                  const status = getSeatStatus(seatNumber);
                  const seatInRow = colIndex + 1;

                  // Add aisle spacing
                  const hasAisleAfter = aisleAfterSeats.includes(seatInRow);

                  return (
                    <div key={seatNumber} className="flex items-center">
                      <motion.button
                        whileHover={status === "available" ? { scale: 1.15 } : undefined}
                        whileTap={status === "available" ? { scale: 0.95 } : undefined}
                        onClick={() => status !== "occupied" && onSeatClick(seatNumber)}
                        disabled={status === "occupied"}
                        className={cn(
                          "seat",
                          status === "available" && "seat-available",
                          status === "occupied" && "seat-occupied",
                          status === "selected" && "seat-selected"
                        )}
                        title={`${getRowLabel(rowIndex)}${seatInRow}`}
                      />
                      {hasAisleAfter && <div className="w-4" />}
                    </div>
                  );
                })}
              </div>

              {/* Row Label (right side) */}
              <div className="w-6 text-xs font-semibold text-zinc-500 text-left ml-2">
                {getRowLabel(rowIndex)}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        className="flex items-center justify-center gap-8 mt-6 text-sm"
      >
        <div className="flex items-center gap-2">
          <div className="seat seat-available scale-75" />
          <span className="text-zinc-400">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="seat seat-occupied scale-75" />
          <span className="text-zinc-400">Occupied</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="seat seat-selected scale-75" />
          <span className="text-zinc-400">Selected</span>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex items-center gap-6 mt-4 text-sm"
      >
        <div className="flex items-center gap-2">
          <span className="text-zinc-500">Total:</span>
          <span className="font-semibold text-white">{totalSeats}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-zinc-500">Available:</span>
          <span className="font-semibold text-green-400">
            {totalSeats - occupiedSeats.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-zinc-500">Selected:</span>
          <span className="font-semibold text-indigo-400">
            {selectedSeats.length}
          </span>
        </div>
      </motion.div>
    </div>
  );
}

// Compact version for smaller displays
export function CompactSeatGrid({
  totalSeats,
  occupiedSeats,
  selectedSeats,
  onSeatClick,
  className,
}: SeatGridProps) {
  const seatsPerRow = 10;
  const totalRows = Math.ceil(totalSeats / seatsPerRow);

  const getSeatStatus = (seatNumber: number): "available" | "occupied" | "selected" => {
    if (selectedSeats.includes(seatNumber)) return "selected";
    if (occupiedSeats.includes(seatNumber)) return "occupied";
    return "available";
  };

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      {/* Compact Screen */}
      <div className="w-full max-w-md">
        <div className="h-2 bg-gradient-to-r from-transparent via-amber-400 to-transparent rounded-full" />
        <div className="text-center text-[10px] text-zinc-500 mt-1">SCREEN</div>
      </div>

      {/* Compact Grid */}
      <div className="flex flex-col gap-1 mt-4">
        {Array.from({ length: totalRows }, (_, rowIndex) => {
          const startSeat = rowIndex * seatsPerRow + 1;
          const endSeat = Math.min((rowIndex + 1) * seatsPerRow, totalSeats);
          const seatsInRow = endSeat - startSeat + 1;

          return (
            <div key={rowIndex} className="flex items-center gap-0.5">
              <div className="w-4 text-[9px] font-medium text-zinc-600 text-right mr-1">
                {String.fromCharCode(65 + rowIndex)}
              </div>
              {Array.from({ length: seatsInRow }, (_, colIndex) => {
                const seatNumber = startSeat + colIndex;
                const status = getSeatStatus(seatNumber);
                const hasAisle = colIndex === 4;

                return (
                  <div key={seatNumber} className="flex items-center">
                    <button
                      onClick={() => status !== "occupied" && onSeatClick(seatNumber)}
                      disabled={status === "occupied"}
                      className={cn(
                        "w-4 h-3 rounded-t-sm transition-all",
                        status === "available" && "bg-zinc-700 hover:bg-indigo-500",
                        status === "occupied" && "bg-red-500 cursor-not-allowed",
                        status === "selected" && "bg-green-500"
                      )}
                    />
                    {hasAisle && <div className="w-2" />}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
