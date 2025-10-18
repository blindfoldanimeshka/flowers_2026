import Logo from "./Logo";
import Nav from "./Nav";
import CartIcon from "./CartIcon";

export default function Header() {
    return (
        <>
            <header className="fixed top-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-lg shadow-xl border-b border-neutral-100 min-h-[112px] rounded-b-3xl">
                <div className="absolute inset-0 pointer-events-none" style={{background: 'linear-gradient(90deg, #fff 60%, #ffe1e1 100%)', opacity: 0.5, borderRadius: '0 0 1.5rem 1.5rem'}} />
                <div className="relative grid grid-cols-[minmax(180px,1fr)_minmax(320px,2fr)_minmax(180px,1fr)] items-center max-w-7xl mx-auto px-4 py-7 gap-8">
                    {/* Логотип слева */}
                    <div className="flex items-center justify-start">
                        <Logo />
                    </div>
                    {/* Категории по центру */}
                    <div className="flex items-center justify-center gap-6 px-4 flex-wrap">
                        <Nav />
                    </div>
                    {/* Корзина справа */}
                    <div className="flex items-center justify-end">
                        <CartIcon />
                    </div>
                </div>
                <style jsx>{`
                    header {
                        font-family: 'Geist', 'Inter', 'Segoe UI', Arial, sans-serif;
                        transition: box-shadow 0.3s cubic-bezier(.4,0,.2,1), background 0.3s cubic-bezier(.4,0,.2,1);
                    }
                    header:hover {
                        box-shadow: 0 8px 32px 0 rgba(255, 193, 203, 0.15);
                    }
                    nav a {
                        transition: color 0.2s, background 0.2s;
                    }
                    nav a:hover {
                        color: #e75480;
                        background: #ffe1e1;
                        border-radius: 0.5rem;
                    }
                    @media (max-width: 1024px) {
                        header > div.relative { gap: 6px; padding-left: 8px; padding-right: 8px; grid-template-columns: 1fr 2fr 1fr; }
                    }
                    @media (max-width: 768px) {
                        header > div.relative { grid-template-columns: 1fr; gap: 16px; padding: 12px 4px; }
                        header > div.relative > div { justify-content: center !important; min-width: 0; padding: 8px 0; }
                    }
                `}</style>
            </header>
        </>
    )
}
