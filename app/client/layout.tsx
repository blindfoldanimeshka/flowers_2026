export const dynamic = 'force-dynamic';
import Footer from "./components/layout/Footer";
import SocialButton from "./components/layout/SocialButton";
import HeaderSwitcher from "./components/widget/HeaderSwitcher";
import FadeWrapper from "./components/FadeWrapper";
import TopInfoPanel from "./components/layout/TopInfoPanel";
import { getCachedSettings } from "@/lib/cache";

const defaultPublicSettings = {
    siteName: "Floramix",
    siteDescription: "",
    contactPhone: "",
    address: "",
    workingHours: "",
    socialLinks: {},
};

export default async function ClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    let plainSettings = defaultPublicSettings;

    try {
        const settings = await getCachedSettings();
        if (settings) {
            plainSettings = {
                ...defaultPublicSettings,
                ...JSON.parse(JSON.stringify(settings)),
            };
        }
    } catch (error) {
        console.error("Failed to load public settings, using defaults:", error);
    }

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
