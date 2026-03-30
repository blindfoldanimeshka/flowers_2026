'use client'
import { motion } from "framer-motion";

type TopInfoSettings = {
  contactPhone?: string;
  workingHours?: string;
};

export default function TopInfoPanel({ settings }: { settings?: TopInfoSettings }) {
  const { contactPhone, workingHours } = settings || {};
  const phoneLink = contactPhone ? `tel:${contactPhone.replace(/\D/g, '')}` : undefined;
  
  return (
    <motion.div 
      className="fixed left-0 right-0 z-20 bg-[#FFE1E1] text-center py-1 text-[15px] font-medium border-b border-[#FFD6D6] min-h-[var(--top-info-height)] flex items-center justify-center px-2 top-[calc(var(--safe-area-top)+var(--header-mobile-height))] lg:top-[104px]"
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        {contactPhone && <a href={phoneLink} className="hover:underline">{contactPhone}</a>}
        {contactPhone && workingHours && <>&nbsp;|&nbsp;</>}
        {workingHours && <span>{workingHours}</span>}
      </motion.div>
    </motion.div>
  );
} 
