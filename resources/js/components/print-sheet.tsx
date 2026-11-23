import { LogoMark } from '@/components/logo';
import { useT } from '@/lib/i18n';
import type { Party } from '@/types';
import { Head } from '@inertiajs/react';
import { ArrowLeft, Printer } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * An A4 page for printing or "Save as PDF" from the browser. Always black on white, also in dark mode.
 * The toolbar is hidden on paper (see `.no-print` in app.css).
 */
export function PrintSheet({ title, back, children }: { title: string; back: string; children: ReactNode }) {
    const t = useT();
    return (
        <div className="print-root min-h-screen bg-[#e9ebee] text-[#111] print:bg-white">
            <Head title={title} />
            <div className="no-print sticky top-0 z-10 flex items-center gap-3 border-b border-black/10 bg-white/90 px-4 py-2.5 backdrop-blur">
                <a href={back} className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13.5px] text-[#333] hover:bg-black/5">
                    <ArrowLeft className="size-4" /> {t('Back')}
                </a>
                <span className="flex-1 truncate text-center text-[13.5px] font-medium">{title}</span>
                <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex h-9 items-center gap-2 rounded-md bg-[#141618] px-3.5 text-[13.5px] font-semibold text-white hover:bg-black"
                >
                    <Printer className="size-4" /> {t('Print or save as PDF')}
                </button>
            </div>
            {/* On a phone the A4 preview scrolls sideways inside this box; the page itself stays phone-wide. */}
            <div className="overflow-x-auto print:overflow-visible">
                <div className="sheet mx-auto my-6 min-h-[297mm] w-[210mm] bg-white px-[16mm] py-[14mm] text-[12px] leading-[1.45] shadow-[0_2px_16px_rgba(0,0,0,.12)]">
                    {children}
                </div>
            </div>
        </div>
    );
}

/** Company block at the top of printed pages. */
export function SheetCompany({ company }: { company: Party }) {
    const contact = [company.phone, company.email].filter(Boolean).join(' · ');
    return (
        <div className="flex items-center gap-3">
            <LogoMark size={46} className="text-[#141618]" />
            <div className="leading-tight">
                <div className="text-[16px] font-semibold">{company.name}</div>
                {company.address && <div className="text-[11px] text-[#555]">{company.address}</div>}
                {contact && <div className="text-[11px] text-[#555]">{contact}</div>}
            </div>
        </div>
    );
}

export function SheetLabel({ children }: { children: ReactNode }) {
    return <div className="mb-1 text-[10.5px] font-semibold text-[#666]">{children}</div>;
}
