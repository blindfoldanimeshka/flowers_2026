export default function BottomHeader() {
    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-4 p-2 sm:justify-around rounded-b-[30px] bg-[#F0D2D2] text-[13px] sm:text-[16px]">
            <h3 className="truncate max-w-full sm:max-w-none">Адрес: г. Москва, ул. Ленина, 1</h3>
            <h3 className="truncate max-w-full sm:max-w-none">Телефон: +7 (999) 999-99-99</h3>
            <h3 className="truncate max-w-full sm:max-w-none">Время работы: 9:00 - 18:00</h3>
        </div>
    )
}