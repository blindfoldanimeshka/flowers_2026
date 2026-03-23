'use client'

import { motion } from "framer-motion";
import CategoryGrid from "@/app/client/components/catalog/CategoryGrid";
import { HomeCatalogSection } from '@/features/app/catalog';

export default function HomePage() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <motion.div className="mt-40" initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, delay: 0.2 }}>
        <CategoryGrid />
      </motion.div>
      <motion.div className="mt-16" initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, delay: 0.4 }}>
        <HomeCatalogSection />
      </motion.div>
    </motion.div>
  );
}

