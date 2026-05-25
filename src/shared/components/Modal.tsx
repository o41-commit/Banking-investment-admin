"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "./Button";

type ModalProps = {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
};

export function Modal({ open, title, children, onClose }: ModalProps) {
  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 16 }}
            className="panel w-full max-w-lg overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="text-lg font-semibold text-ink">{title}</h2>
              <Button variant="ghost" className="size-9 p-0" onClick={onClose} aria-label="Close modal">
                <X size={18} />
              </Button>
            </div>
            <div className="p-5">{children}</div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
