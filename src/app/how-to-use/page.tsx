import TopNav from "@/components/TopNav";
import SideNav from "@/components/SideNav";
import Link from "next/link";

export default function HowToUsePage() {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="flex-1 overflow-y-auto bg-[#f8f9ff] p-8 custom-scroll">
          <div className="max-w-[800px] mx-auto bg-white border border-[#c6c6cd] rounded-lg p-8">
            <h1 className="text-[32px] font-semibold text-black tracking-tight mb-4">
              How to Use RaderX
            </h1>
            <p className="text-[16px] text-[#45464d] leading-6 mb-8">
              RaderX is an autonomous strategic intelligence agent that monitors your competitors, tracks scientific research, and identifies market opportunities before they become obvious.
            </p>

            <div className="space-y-10">
              {/* Step 1 */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold">1</div>
                  <h2 className="text-[20px] font-semibold text-black">Start an Investigation</h2>
                </div>
                <p className="text-[15px] text-[#45464d] leading-6 mb-4 ml-11">
                  Navigate to the <Link href="/investigate" className="text-black font-semibold underline">Investigations</Link> tab and configure your analysis parameters. Tell the AI exactly what you want to know.
                </p>
                <div className="ml-11 bg-[#f8f9ff] border border-[#c6c6cd] p-5 rounded">
                  <h3 className="font-semibold text-black mb-2 text-[14px]">Example Scenario:</h3>
                  <ul className="text-[14px] text-[#45464d] space-y-2 font-mono">
                    <li><span className="font-semibold text-black">Organization:</span> NVIDIA</li>
                    <li><span className="font-semibold text-black">Technology:</span> AI Inference Chips</li>
                    <li><span className="font-semibold text-black">Competitors:</span> AMD, Intel, Google</li>
                    <li><span className="font-semibold text-black">Strategic Question:</span> What new architectural advantages are competitors developing to challenge our inference market share?</li>
                  </ul>
                </div>
              </section>

              {/* Step 2 */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold">2</div>
                  <h2 className="text-[20px] font-semibold text-black">Review the Intelligence Report</h2>
                </div>
                <p className="text-[15px] text-[#45464d] leading-6 mb-4 ml-11">
                  Once the agent finishes dynamically searching through research papers, patents, and web news, it correlates the data and generates a highly structured report.
                </p>
                <div className="ml-11 grid grid-cols-2 gap-4">
                  <div className="bg-[#ffdad6] border border-[#ba1a1a]/20 p-4 rounded">
                    <h3 className="font-semibold text-[#ba1a1a] mb-1 text-[14px]">Strategic Threats</h3>
                    <p className="text-[12px] text-[#ba1a1a]">Identify high-impact risks where competitors are gaining an edge.</p>
                  </div>
                  <div className="bg-[#82f5c1]/30 border border-[#006c4a]/20 p-4 rounded">
                    <h3 className="font-semibold text-[#006c4a] mb-1 text-[14px]">Market Opportunities</h3>
                    <p className="text-[12px] text-[#006c4a]">Discover whitespace in the market based on patent voids or emerging research.</p>
                  </div>
                </div>
              </section>

              {/* Step 3 */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold">3</div>
                  <h2 className="text-[20px] font-semibold text-black">Save as an Active Watch</h2>
                </div>
                <p className="text-[15px] text-[#45464d] leading-6 mb-4 ml-11">
                  Don't want to run this manually every time? At the end of any investigation, click <strong>"Save as Watch"</strong>.
                </p>
                <p className="text-[14px] text-[#45464d] leading-5 ml-11">
                  RaderX will continuously scan these parameters in the background (via cron jobs). When new signals are detected, they are automatically cross-referenced against past findings so you only see net-new critical intelligence on your Dashboard.
                </p>
              </section>

              <div className="pt-6 mt-8 border-t border-[#c6c6cd] text-center">
                <Link
                  href="/investigate"
                  className="bg-black text-white text-[14px] font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition-opacity inline-block"
                >
                  Start Your First Investigation Now
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
