'use client'
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

export default function Footer({ settings }: { settings: any }) {
    const { address, contactPhone, contactPhone2, contactPhone3, workingHours, pickupHours, deliveryHours, deliveryInfo, socialLinks } = settings || {};
    const phones = [contactPhone, contactPhone2, contactPhone3].filter(Boolean);
    const phoneLink = contactPhone ? `tel:${contactPhone.replace(/\D/g, '')}` : undefined;

    // Формируем строку времени работы
    let hoursDisplay = '';
    if (pickupHours || deliveryHours) {
        const parts: string[] = [];
        if (pickupHours) parts.push(`Самовывоз: ${pickupHours}`);
        if (deliveryHours) {
            let deliveryText = `Доставка: ${deliveryHours}`;
            if (deliveryInfo) deliveryText += ` (${deliveryInfo})`;
            parts.push(deliveryText);
        }
        hoursDisplay = parts.join(', ');
    } else {
        hoursDisplay = workingHours;
    }

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
            className="bg-[#F0D2D2] shrink-0 py-8 sm:py-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
        >
            <div className="mx-auto max-w-6xl px-4">
                <motion.div
                    className="flex justify-center gap-x-2 items-center mb-8"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                >
                    <Image src="/image/logo.svg" alt="logo" width={40} height={40} loading="eager" />
                    <h1 className="text-[30px] font-bold">Floramix</h1>
                </motion.div>

                <motion.div
                    className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                >
                    {/* Контакты */}
                    <motion.div
                        className="text-center md:text-left"
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ duration: 0.4, delay: 0.6 }}
                    >
                        <h3 className="text-sm font-semibold text-gray-800 mb-3 uppercase tracking-wide">Контакты</h3>
                        <div className="space-y-2">
                            {phones.length > 0 && phones.map((phone, index) => (
                                <a
                                    key={index}
                                    href={`tel:${phone.replace(/\D/g, '')}`}
                                    className="block text-gray-700 hover:text-gray-900 transition-colors text-base font-medium"
                                >
                                    {phone}
                                </a>
                            ))}
                            {address && (
                                <p className="text-gray-700 text-sm mt-3">{address}</p>
                            )}
                        </div>
                    </motion.div>

                    {/* Время работы */}
                    {hoursDisplay && (
                        <motion.div
                            className="text-center md:text-left"
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ duration: 0.4, delay: 0.7 }}
                        >
                            <h3 className="text-sm font-semibold text-gray-800 mb-3 uppercase tracking-wide">Время работы</h3>
                            <div className="text-gray-700 text-sm space-y-1">
                                {hoursDisplay.split(', ').map((line, index) => {
                                    // Делаем "Самовывоз:" и "Доставка:" жирными
                                    const parts = line.split(': ');
                                    if (parts.length === 2) {
                                        return (
                                            <p key={index}>
                                                <span className="font-semibold">{parts[0]}:</span> {parts[1]}
                                            </p>
                                        );
                                    }
                                    return <p key={index}>{line}</p>;
                                })}
                            </div>
                        </motion.div>
                    )}

                    {/* Соцсети */}
                    {footerSocialButtons.length > 0 && (
                        <motion.div
                            className="text-center md:text-left"
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ duration: 0.4, delay: 0.8 }}
                        >
                            <h3 className="text-sm font-semibold text-gray-800 mb-3 uppercase tracking-wide">Мы в соцсетях</h3>
                            <div className="flex items-center justify-center md:justify-start gap-3">
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
                            </div>
                        </motion.div>
                    )}
                </motion.div>
            </div>
        </motion.footer>
    );
}
