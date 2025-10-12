export const dynamic = 'force-dynamic';
import Footer from "./components/layout/Footer";
import SocialButton from "./components/layout/SocialButton";
import HeaderSwitcher from "./components/widget/HeaderSwitcher";
import FadeWrapper from "./components/FadeWrapper";
import TopInfoPanel from "./components/layout/TopInfoPanel";
import { getCachedSettings } from "@/lib/cache";

export default async function ClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const settings = await getCachedSettings();
    const plainSettings = JSON.parse(JSON.stringify(settings));
    return (
        <>
            <div
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    backgroundImage: "url('/image/bg.png')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    opacity: 0.5,
                    zIndex: -1,
                }}
            />
            <HeaderSwitcher />
            <TopInfoPanel settings={plainSettings} />
            <FadeWrapper>
              {children}
            </FadeWrapper>
            <SocialButton settings={plainSettings} />
            <Footer settings={plainSettings} />
        </>
    )
}
