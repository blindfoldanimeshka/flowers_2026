'use client'
import { useContext } from "react";
import { SettingsContext } from "../../ServerSettingsProvider";
import Image from "next/image";
import { motion } from "framer-motion";

export default function Footer({ settings }: { settings: any }) {
    const { address, contactPhone, workingHours } = settings || {};
    const phoneLink = contactPhone ? `tel:${contactPhone.replace(/\D/g, '')}` : null;
    return (
        <motion.footer 
            className="bg-[#F0D2D2] grid justify-center py-10 items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
        >
            <div className="">
                <motion.div 
                    className=" flex justify-center gap-x-2 items-center mb-8"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                >
                    <Image src="/image/logo.svg" alt="logo" width={40} height={40} />
                    <h1 className="text-[30px] font-bold">Floramix</h1>
                </motion.div>
                <motion.div 
                    className="grid grid-cols-1 grid-rows-3 items-center gap-y-4 text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                >
                    {address && (
                        <motion.h3 
                            className=""
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ duration: 0.4, delay: 0.6 }}
                        >
                            Адрес: {address}
                        </motion.h3>
                    )}
                    {contactPhone && (
                        <motion.h3 
                            className=""
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ duration: 0.4, delay: 0.7 }}
                        >
                            <a href={phoneLink} className="hover:underline">Телефон: {contactPhone}</a>
                        </motion.h3>
                    )}
                    {workingHours && (
                        <motion.h3 
                            className=""
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ duration: 0.4, delay: 0.8 }}
                        >
                            Время работы: {workingHours}
                        </motion.h3>
                    )}
                </motion.div>
            </div>
        </motion.footer>
    );
}
