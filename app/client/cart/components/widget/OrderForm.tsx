'use client'


import { useState } from 'react';
import { useCart } from '../../../../context/CartContext';
import { useRouter } from 'next/navigation';
import { IMaskInput } from 'react-imask';

export default function OrderForm() {
    const { cartItems, clearCart, getTotalPrice } = useCart();
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
        paymentMethod: 'cash',
        notes: '',
        deliveryType: 'delivery',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (cartItems.length === 0) {
            setError('Ваша корзина пуста.');
            return;
        }
        setIsLoading(true);
        setError('');

        const address = formData.deliveryType === 'pickup' ? 'Самовывоз' : formData.address;
        const orderData = {
            customer: {
                name: formData.name,
                phone: formData.phone,
                email: formData.email,
                address,
            },
            items: cartItems.map(item => ({
                productId: item.id,
                quantity: item.quantity,
            })),
            paymentMethod: formData.paymentMethod,
            notes: formData.notes,
            deliveryType: formData.deliveryType,
        };

        try {
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Не удалось оформить заказ');
            }
            
            setSuccess(true);
            clearCart();
            
            // Можно добавить редирект на страницу благодарности
            // router.push('/thank-you');

        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="bg-[#FFF8F8] p-6 rounded-2xl shadow-lg h-full flex flex-col items-center justify-center text-center">
                <h2 className="text-2xl font-bold text-green-600 mb-4">Заказ успешно оформлен!</h2>
                <p className="text-gray-700">Наш менеджер скоро свяжется с вами. Спасибо за покупку!</p>
            </div>
        );
    }

    return (
        <div className="bg-[#FFF8F8] p-6 rounded-2xl shadow-lg h-full flex flex-col">
            <h2 className="text-xl md:text-2xl font-bold mb-5">Оформление заказа</h2>
            <form onSubmit={handleSubmit} className="flex flex-col h-full">
                <div className="grid gap-3">
                    <h3 className="text-base md:text-lg font-semibold">Ваши данные</h3>
                    <input 
                        type="text" 
                        placeholder="Имя *" 
                        required
                        value={formData.name}
                        onChange={handleChange}
                        name="name"
                        className="w-full border-[#FFDADA] border-[2px] h-[45px] rounded-[20px] p-3 focus:outline-none focus:border-[#FFB6B6] transition-colors" 
                    />
                    <IMaskInput
                        mask="+7 (000) 000-00-00"
                        value={formData.phone}
                        onAccept={(value) => setFormData(prev => ({ ...prev, phone: value }))}
                        type="tel"
                        name="phone"
                        placeholder="Телефон *"
                        required
                        className="w-full border-[#FFDADA] border-[2px] h-[45px] rounded-[20px] p-3 focus:outline-none focus:border-[#FFB6B6] transition-colors"
                    />
                    <input 
                        type="email" 
                        placeholder="Email" 
                        value={formData.email}
                        onChange={handleChange}
                        name="email"
                        className="w-full border-[#FFDADA] border-[2px] h-[45px] rounded-[20px] p-3 focus:outline-none focus:border-[#FFB6B6] transition-colors" 
                    />
                    <input 
                        type="text" 
                        placeholder="Адрес доставки" 
                        value={formData.address}
                        onChange={handleChange}
                        name="address"
                        required={formData.deliveryType === 'delivery'}
                        disabled={formData.deliveryType === 'pickup'}
                        className="w-full border-[#FFDADA] border-[2px] h-[45px] rounded-[20px] p-3 focus:outline-none focus:border-[#FFB6B6] transition-colors disabled:bg-gray-100" 
                    />
                </div>
                
                <div className="mb-4">
                    <label className="font-semibold mb-2 block">Способ получения</label>
                    <div className="flex gap-4">
                        <label>
                            <input
                                type="radio"
                                name="deliveryType"
                                value="delivery"
                                checked={formData.deliveryType === 'delivery'}
                                onChange={(e) => setFormData(prev => ({ ...prev, deliveryType: e.target.value }))}
                            />
                            <span className="ml-2">Доставка</span>
                        </label>
                        <label>
                            <input
                                type="radio"
                                name="deliveryType"
                                value="pickup"
                                checked={formData.deliveryType === 'pickup'}
                                onChange={(e) => setFormData(prev => ({ ...prev, deliveryType: e.target.value }))}
                            />
                            <span className="ml-2">Самовывоз</span>
                        </label>
                    </div>
                </div>

                {formData.deliveryType === 'delivery' && (
                    <div className="mb-4">
                        <label className="block mb-1 font-medium">Способ оплаты</label>
                        <select
                            name="paymentMethod"
                            value={formData.paymentMethod}
                            onChange={handleChange}
                            className="w-full border rounded-lg px-3 py-2 bg-white"
                        >
                            <option value="cash">Наличными при получении</option>
                            <option value="card">Картой при получении</option>
                        </select>
                    </div>
                )}

                <div className="mt-auto">
                    <div className="text-lg font-bold mb-4">
                        Итого: {getTotalPrice()} ₽
                    </div>
                    {error && <p className="text-red-500 mb-2">{error}</p>}
                    <button
                        type="submit"
                        disabled={isLoading || cartItems.length === 0}
                        className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300 disabled:bg-gray-400"
                    >
                        {isLoading ? 'Оформление...' : 'Оформить заказ'}
                    </button>
                </div>
            </form>
        </div>
    );
}
