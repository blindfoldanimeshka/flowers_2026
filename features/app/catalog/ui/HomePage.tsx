'use client'

import { motion } from "framer-motion";
import CategoryGrid from "@/app/client/components/catalog/CategoryGrid";
import HomeBanner from "@/app/client/components/catalog/HomeBanner";
import { HomeCatalogSection } from '@/features/app/catalog';

export default function HomePage() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
      <motion.div className="mt-40" initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.35, delay: 0.03 }}>
        <HomeBanner />
      </motion.div>
      <motion.div className="mt-10" initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.35, delay: 0.05 }}>
        <CategoryGrid />
      </motion.div>
      <motion.div className="mt-16" id="catalog-section" initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.35, delay: 0.08 }}>
        <HomeCatalogSection />
      </motion.div>
    </motion.div>
  );
}

