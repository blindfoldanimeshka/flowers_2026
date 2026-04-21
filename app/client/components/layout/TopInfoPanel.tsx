'use client'
import { motion } from "framer-motion";

type TopInfoSettings = {
  contactPhone?: string;
  contactPhone2?: string;
  contactPhone3?: string;
  workingHours?: string;
  pickupHours?: string;
  deliveryHours?: string;
  deliveryInfo?: string;
};

export default function TopInfoPanel({ settings }: { settings?: TopInfoSettings }) {
  const {
    contactPhone,
    contactPhone2,
    contactPhone3,
    workingHours,
    pickupHours,
    deliveryHours,
    deliveryInfo,
  } = settings || {};

  const phones = [contactPhone, contactPhone2, contactPhone3].filter(Boolean) as string[];
  const phonesDisplay = phones.join(', ');

  const hoursParts: string[] = [];
  if (pickupHours) hoursParts.push(`Самовывоз: ${pickupHours}`);
  if (deliveryHours) {
    const deliveryPart = deliveryInfo
      ? `Доставка: ${deliveryHours} (${deliveryInfo})`
      : `Доставка: ${deliveryHours}`;
    hoursParts.push(deliveryPart);
  }
  const hoursDisplay = hoursParts.length > 0 ? hoursParts.join(', ') : workingHours;

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
        {phonesDisplay && <span>{phonesDisplay}</span>}
        {phonesDisplay && hoursDisplay && <>&nbsp;|&nbsp;</>}
        {hoursDisplay && <span>{hoursDisplay}</span>}
      </motion.div>
    </motion.div>
  );
}
