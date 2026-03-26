'use client'
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

export default function Footer({ settings }: { settings: any }) {
    const { address, contactPhone, workingHours, socialLinks } = settings || {};
    const phoneLink = contactPhone ? `tel:${contactPhone.replace(/\D/g, '')}` : undefined;

    const formatLink = (base: string, value?: string) => {
        if (!value) return undefined;
        if (value.startsWith('http')) return value;
        const username = value.split('/').pop();
        return `${base}${username}`;
    };

    const formatWhatsAppLink = (phone?: string) => {
        if (!phone) return undefined;
        const digitsOnly = phone.replace(/\D/g, '');
        return digitsOnly ? `https://wa.me/${digitsOnly}` : undefined;
    };

    const footerSocialButtons = [
        {
            name: 'Telegram',
            icon: '/icons/telegram.svg',
            href: formatLink('https://t.me/', socialLinks?.telegram),
            style: 'bg-blue-400',
        },
        {
            name: 'VK',
            icon: '/icons/VK.svg',
            href: formatLink('https://vk.com/', socialLinks?.vk),
            style: 'bg-blue-600',
        },
        {
            name: 'Instagram',
            icon: '/icons/instagram.svg',
            href: formatLink('https://instagram.com/', socialLinks?.instagram),
            style: 'bg-pink-500',
        },
        {
            name: 'WhatsApp',
            icon: '/icons/whatsapp.svg',
            href: formatWhatsAppLink(socialLinks?.whatsapp),
            style: 'bg-green-500',
        },
    ].filter((button) => button.href);

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
                    <Image src="/image/logo.svg" alt="logo" width={40} height={40} loading="eager" />
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
                    {footerSocialButtons.length > 0 && (
                        <motion.div
                            className="mt-2 flex items-center justify-center gap-3"
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.4, delay: 0.9 }}
                        >
                            {footerSocialButtons.map((button) => (
                                <Link
                                    key={button.name}
                                    href={button.href || ''}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={button.name}
                                    className={`h-10 w-10 rounded-full flex items-center justify-center text-white shadow-md transition-transform duration-300 hover:scale-110 ${button.style}`}
                                >
                                    <Image src={button.icon} alt={button.name} width={22} height={22} />
                                </Link>
                            ))}
                        </motion.div>
                    )}
                </motion.div>
            </div>
        </motion.footer>
    );
}
