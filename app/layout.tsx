import type {Metadata} from "next";
import "./globals.css";
export const metadata:Metadata={title:"Leadforge · Internships, jobs & referrals",description:"A private career workspace to find recruiters and potential referrers, track openings, and draft relevant requests.",icons:{icon:"/favicon.svg"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
