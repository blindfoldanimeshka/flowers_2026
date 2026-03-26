"use client";
import dynamic from "next/dynamic";
import Header from "../layout/Header";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { motion } from "framer-motion";

const HeaderMobile = dynamic(() => import("../layout/Header/HeaderMobile"), { ssr: false });

export default function HeaderSwitcher() {
  const isMobile = useMediaQuery("(max-width: 767px)");
  return (
    <motion.div 
      className="fixed top-0 left-0 right-0 z-50"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, type: "spring", damping: 20 }}
    >
      {isMobile ? <HeaderMobile /> : <Header />}
    </motion.div>
  );
} 