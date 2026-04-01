import React from 'react';
import Footer from '@/components/Footer';
import { Link } from 'react-router-dom';
import { getWebsiteAssetUrl } from '@/lib/storage';

const TermsPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-esports-dark text-white">
            <main className="container mx-auto px-4 py-16 max-w-4xl">
                {/* Header */}
                <div className="mb-12">
                    <Link to="/" className="inline-block mb-8">
                        <img
                            src={getWebsiteAssetUrl('eSportra-Logo/eSPORTRA-white-transparent.png')}
                            alt="Esportra"
                            className="h-8 opacity-80"
                        />
                    </Link>
                    <h1 className="text-4xl md:text-5xl font-extrabold mb-3 bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                        Terms of Service
                    </h1>
                    <p className="text-gray-400 text-sm">
                        Last updated: February 13, 2026 &middot; Effective Date: February 13, 2026
                    </p>
                </div>

                <div className="space-y-10 text-gray-300 leading-relaxed">
                    {/* ── Introduction ── */}
                    <section>
                        <p className="text-gray-400 text-lg leading-relaxed">
                            Welcome to Esportra. These Terms of Service (&quot;Terms,&quot; &quot;Agreement&quot;) constitute a legally binding contract between you (&quot;User,&quot; &quot;you,&quot; or &quot;your&quot;) and Esportra (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) governing your access to and use of the Esportra platform, including our website at{' '}
                            <a href="https://esportra.com" className="text-rose-400 hover:text-rose-300 underline underline-offset-2">esportra.com</a>,
                            our mobile applications, APIs, partner portal, and all related services, features, content, and functionality (collectively, the &quot;Platform&quot;).
                        </p>
                        <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 mt-4">
                            <p className="text-rose-300 text-sm font-medium">
                                ⚠️ IMPORTANT: By creating an account, accessing, or using the Platform, you acknowledge that you have read, understood, and agree to be bound by these Terms and our{' '}
                                <Link to="/privacy" className="text-rose-400 hover:text-rose-300 underline underline-offset-2">Privacy Policy</Link>,
                                which is incorporated by reference. If you do not agree to these Terms, you must not use the Platform.
                            </p>
                        </div>
                    </section>

                    {/* ── 1. Eligibility ── */}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-rose-500 font-mono text-lg">01.</span> Eligibility
                        </h2>
                        <p className="mb-3">To use the Platform, you must meet all of the following requirements:</p>
                        <ul className="list-disc list-inside space-y-2 ml-4 text-gray-400">
                            <li>Be at least 13 years of age (or the minimum age required in your jurisdiction).</li>
                            <li>If you are between 13 and 18 years old (or the age of majority in your jurisdiction), you must have the consent and supervision of a parent or legal guardian who agrees to be bound by these Terms.</li>
                            <li>Have the legal capacity to enter into this Agreement.</li>
                            <li>Not be barred from using the Platform under any applicable laws or regulations.</li>
                            <li>Not have been previously banned or removed from the Platform for violations of these Terms.</li>
                        </ul>
                        <p className="mt-3 text-gray-400">
                            By using the Platform, you represent and warrant that you meet all eligibility requirements. We reserve the right to request proof of age or identity at any time and to suspend or terminate accounts that do not meet these requirements.
                        </p>
                    </section>

                    {/* ── 2. Account Registration & Security ── */}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-rose-500 font-mono text-lg">02.</span> Account Registration & Security
                        </h2>

                        <h3 className="text-lg font-semibold text-white mb-2 mt-4">2.1 Account Creation</h3>
                        <p className="text-gray-400 mb-3">
                            To access most features of the Platform, you must create an account by providing accurate, current, and complete information. You agree to update your information promptly to keep it accurate and complete at all times. Providing false, misleading, or outdated information may result in account suspension or termination.
                        </p>

                        <h3 className="text-lg font-semibold text-white mb-2 mt-4">2.2 Account Security</h3>
                        <p className="text-gray-400 mb-3">
                            You are solely responsible for maintaining the confidentiality of your account credentials (email, password, and any authentication tokens). You agree to:
                        </p>
                        <ul className="list-disc list-inside space-y-2 ml-4 text-gray-400">
                            <li>Choose a strong, unique password and not reuse it from other services.</li>
                            <li>Not share your account credentials with any other person.</li>
                            <li>Immediately notify us at <a href="mailto:operations@esportra.com" className="text-rose-400 hover:text-rose-300 underline underline-offset-2">operations@esportra.com</a> of any unauthorized access or suspected breach of your account.</li>
                            <li>Accept full responsibility for all activities that occur under your account, whether or not authorized by you.</li>
                        </ul>

                        <h3 className="text-lg font-semibold text-white mb-2 mt-4">2.3 One Account Per User</h3>
                        <p className="text-gray-400">
                            Each user may maintain only one active account on the Platform. Creating multiple accounts (&quot;multi-accounting&quot;) to gain competitive advantages, circumvent bans, or for any other purpose is strictly prohibited and will result in the termination of all associated accounts without prior notice.
                        </p>
                    </section>

                    {/* ── 3. Platform Services ── */}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-rose-500 font-mono text-lg">03.</span> Platform Services
                        </h2>
                        <p className="mb-4">Esportra provides the following services, subject to these Terms:</p>

                        <h3 className="text-lg font-semibold text-white mb-2 mt-4">3.1 Tournament Services</h3>
                        <ul className="list-disc list-inside space-y-2 ml-4 text-gray-400">
                            <li><strong className="text-gray-200">Tournament Discovery:</strong> Browse, search, and filter competitive gaming tournaments across multiple titles and formats.</li>
                            <li><strong className="text-gray-200">Registration:</strong> Register as an individual player or as a team for available tournaments.</li>
                            <li><strong className="text-gray-200">Check-in System:</strong> Check in before matches to confirm readiness and availability.</li>
                            <li><strong className="text-gray-200">Bracket & Matchmaking:</strong> Automated bracket generation, seeding, and matchmaking for various formats (single elimination, double elimination, round robin, Swiss).</li>
                            <li><strong className="text-gray-200">Result Reporting:</strong> Submit and verify match results, including score reporting and screenshot/VOD evidence.</li>
                            <li><strong className="text-gray-200">Dispute Resolution:</strong> File and resolve disputes about match results through our structured dispute system.</li>
                        </ul>

                        <h3 className="text-lg font-semibold text-white mb-2 mt-4">3.2 Team Management</h3>
                        <ul className="list-disc list-inside space-y-2 ml-4 text-gray-400">
                            <li><strong className="text-gray-200">Team Creation:</strong> Create and manage competitive teams with custom branding (name, logo, description).</li>
                            <li><strong className="text-gray-200">Roster Management:</strong> Invite players, manage roles (Owner, Captain, Player), and maintain team rosters.</li>
                            <li><strong className="text-gray-200">Team Registration:</strong> Register your team for tournaments and manage team-level participation.</li>
                        </ul>

                        <h3 className="text-lg font-semibold text-white mb-2 mt-4">3.3 Organizer Services</h3>
                        <ul className="list-disc list-inside space-y-2 ml-4 text-gray-400">
                            <li><strong className="text-gray-200">Organization Management:</strong> Create and manage esports organizations with verification capabilities.</li>
                            <li><strong className="text-gray-200">Tournament Administration:</strong> Create, configure, and manage tournaments with full administrative controls.</li>
                            <li><strong className="text-gray-200">Venue Management:</strong> List and manage physical or virtual venues for events.</li>
                            <li><strong className="text-gray-200">Staff Management:</strong> Assign and manage tournament staff with role-based permissions.</li>
                            <li><strong className="text-gray-200">Analytics & Reporting:</strong> Access tournament analytics, participation metrics, and engagement data.</li>
                        </ul>

                        <h3 className="text-lg font-semibold text-white mb-2 mt-4">3.4 Community Features</h3>
                        <ul className="list-disc list-inside space-y-2 ml-4 text-gray-400">
                            <li><strong className="text-gray-200">Player Profiles:</strong> Public profiles showcasing tournament history, statistics, and competitive achievements.</li>
                            <li><strong className="text-gray-200">Leaderboards:</strong> Game-specific and global rankings based on competitive performance.</li>
                            <li><strong className="text-gray-200">Notifications:</strong> Real-time and email notifications for matches, check-ins, team invitations, and other activities.</li>
                        </ul>

                        <h3 className="text-lg font-semibold text-white mb-2 mt-4">3.5 Sponsorship & Advertising</h3>
                        <ul className="list-disc list-inside space-y-2 ml-4 text-gray-400">
                            <li><strong className="text-gray-200">Partner Portal:</strong> A dedicated portal for sponsors and advertising partners to create and manage campaigns.</li>
                            <li><strong className="text-gray-200">Sponsored Content:</strong> Display of relevant advertising and sponsor branding throughout the Platform.</li>
                            <li><strong className="text-gray-200">Impression Tracking:</strong> Performance measurement and reporting for advertising campaigns.</li>
                        </ul>
                    </section>

                    {/* ── 4. User Conduct & Responsibilities ── */}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-rose-500 font-mono text-lg">04.</span> User Conduct & Responsibilities
                        </h2>

                        <h3 className="text-lg font-semibold text-white mb-2 mt-4">4.1 General Conduct</h3>
                        <p className="text-gray-400 mb-3">You agree to use the Platform in a manner that is lawful, respectful, and consistent with the spirit of fair competition. You shall not:</p>
                        <ul className="list-disc list-inside space-y-2 ml-4 text-gray-400">
                            <li>Violate any applicable local, state, national, or international law or regulation.</li>
                            <li>Impersonate any person or entity, or falsely state or misrepresent your identity, affiliation, age, or any other information.</li>
                            <li>Harass, bully, threaten, intimidate, or abuse any other user, organizer, or staff member.</li>
                            <li>Post or transmit any content that is defamatory, obscene, pornographic, hateful, discriminatory, or otherwise objectionable.</li>
                            <li>Engage in any activity that could harm, disable, overburden, or impair the Platform or interfere with any other user's experience.</li>
                            <li>Use automated scripts, bots, scrapers, or other automated means to access the Platform without our express written permission.</li>
                            <li>Attempt to gain unauthorized access to the Platform, other user accounts, or any computer systems or networks connected to the Platform.</li>
                            <li>Circumvent, disable, or otherwise interfere with security features of the Platform.</li>
                            <li>Collect or harvest any personal information of other users without their consent.</li>
                            <li>Use the Platform for any commercial purpose not expressly authorized by us.</li>
                        </ul>

                        <h3 className="text-lg font-semibold text-white mb-2 mt-4">4.2 Competitive Integrity</h3>
                        <p className="text-gray-400 mb-3">As a competitive gaming platform, fair play is paramount. The following are strictly prohibited:</p>
                        <ul className="list-disc list-inside space-y-2 ml-4 text-gray-400">
                            <li><strong className="text-gray-200">Cheating:</strong> Using hacks, exploits, unauthorized modifications, aimbots, wallhacks, speed hacks, or any third-party software that provides an unfair advantage in competition.</li>
                            <li><strong className="text-gray-200">Match Fixing:</strong> Arranging or colluding to predetermine the outcome of a match, including intentionally losing (&quot;throwing&quot;), win-trading, or any form of competitive manipulation.</li>
                            <li><strong className="text-gray-200">Smurfing:</strong> Competing on an alternate or lower-ranked account to gain an unfair advantage against less skilled opponents in competitive play.</li>
                            <li><strong className="text-gray-200">Account Sharing:</strong> Allowing another person to play on your account during competitive matches or tournaments.</li>
                            <li><strong className="text-gray-200">Boosting:</strong> Having a higher-skilled player play on your account to artificially inflate your ranking or competitive standing.</li>
                            <li><strong className="text-gray-200">Exploiting:</strong> Intentionally abusing bugs, glitches, or unintended game mechanics to gain an unfair competitive advantage.</li>
                            <li><strong className="text-gray-200">Intentional Disconnection:</strong> Deliberately disconnecting from matches to avoid losses, manipulate results, or disrupt competition.</li>
                            <li><strong className="text-gray-200">Unsportsmanlike Conduct:</strong> Toxic behavior, griefing, excessive taunting, rage-quitting, or any conduct that degrades the competitive experience for other participants.</li>
                            <li><strong className="text-gray-200">False Reporting:</strong> Submitting fabricated match results, fraudulent evidence, or baseless disputes to manipulate competitive outcomes.</li>
                            <li><strong className="text-gray-200">Gambling & Match Betting:</strong> Using the Platform information for illegal gambling purposes or coordinating with betting entities to influence competitive outcomes.</li>
                        </ul>

                        <h3 className="text-lg font-semibold text-white mb-2 mt-4">4.3 Tournament Rules</h3>
                        <p className="text-gray-400 mb-3">When participating in tournaments on the Platform, you agree to:</p>
                        <ul className="list-disc list-inside space-y-2 ml-4 text-gray-400">
                            <li>Comply with all tournament-specific rules as published by the tournament organizer.</li>
                            <li>Check in on time as required, understanding that failure to check in may result in automatic disqualification.</li>
                            <li>Report match results accurately and promptly.</li>
                            <li>Cooperate with dispute resolution processes and provide truthful information.</li>
                            <li>Accept the final decisions of tournament administrators and our dispute resolution team.</li>
                            <li>Not interfere with the administration or operation of any tournament.</li>
                        </ul>
                    </section>

                    {/* ── 5. Content & Intellectual Property ── */}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-rose-500 font-mono text-lg">05.</span> Content & Intellectual Property
                        </h2>

                        <h3 className="text-lg font-semibold text-white mb-2 mt-4">5.1 Our Intellectual Property</h3>
                        <p className="text-gray-400 mb-3">
                            The Platform, including its design, code, features, functionality, graphics, logos, trademarks, trade names, service marks, user interface, and all content created by Esportra (collectively, &quot;Esportra Content&quot;), is owned by or licensed to Esportra and is protected by copyright, trademark, patent, and other intellectual property laws. You may not copy, modify, distribute, sell, lease, reverse engineer, decompile, disassemble, or create derivative works from any Esportra Content without our express written permission.
                        </p>

                        <h3 className="text-lg font-semibold text-white mb-2 mt-4">5.2 User-Generated Content</h3>
                        <p className="text-gray-400 mb-3">
                            You retain ownership of content you create and submit through the Platform (&quot;User Content&quot;), including team logos, profile descriptions, tournament descriptions, dispute evidence, and any other content you upload. By submitting User Content, you grant Esportra a worldwide, non-exclusive, royalty-free, sublicensable, and transferable license to use, reproduce, modify, display, distribute, and perform your User Content in connection with the operation, promotion, and improvement of the Platform.
                        </p>
                        <p className="text-gray-400 mb-3">You represent and warrant that:</p>
                        <ul className="list-disc list-inside space-y-2 ml-4 text-gray-400">
                            <li>You own or have all necessary rights and permissions to submit your User Content.</li>
                            <li>Your User Content does not infringe upon the intellectual property rights, privacy rights, or any other rights of any third party.</li>
                            <li>Your User Content does not contain any viruses, malware, or other harmful code.</li>
                            <li>Your User Content complies with all applicable laws and these Terms.</li>
                        </ul>

                        <h3 className="text-lg font-semibold text-white mb-2 mt-4">5.3 Content Moderation</h3>
                        <p className="text-gray-400">
                            We reserve the right, but have no obligation, to monitor, review, edit, or remove any User Content at our sole discretion, without notice, for any reason, including but not limited to suspected violations of these Terms, applicable laws, or our content policies. We are not responsible for User Content posted by users.
                        </p>

                        <h3 className="text-lg font-semibold text-white mb-2 mt-4">5.4 DMCA & Copyright Complaints</h3>
                        <p className="text-gray-400">
                            If you believe that any content on the Platform infringes your copyright, please submit a takedown notice to{' '}
                            <a href="mailto:operations@esportra.com" className="text-rose-400 hover:text-rose-300 underline underline-offset-2">operations@esportra.com</a>{' '}
                            with the following information: (a) a description of the copyrighted work; (b) the location of the infringing material on the Platform; (c) your contact information; (d) a statement that you have a good-faith belief that the use is unauthorized; (e) a statement under penalty of perjury that the information is accurate; and (f) your physical or electronic signature.
                        </p>
                    </section>

                    {/* ── 6. Organizer Terms ── */}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-rose-500 font-mono text-lg">06.</span> Additional Terms for Organizers
                        </h2>
                        <p className="text-gray-400 mb-3">
                            If you use the Platform as a tournament organizer or on behalf of an esports organization, the following additional terms apply:
                        </p>
                        <ul className="list-disc list-inside space-y-2 ml-4 text-gray-400">
                            <li><strong className="text-gray-200">Authority:</strong> You represent and warrant that you have the authority to bind the organization you represent and to accept these Terms on its behalf.</li>
                            <li><strong className="text-gray-200">Accuracy:</strong> You agree to provide accurate and complete tournament information, including rules, schedules, game titles, format, entry requirements, and prizes.</li>
                            <li><strong className="text-gray-200">Fair Administration:</strong> You agree to administer tournaments fairly, consistently, and in accordance with the published rules. Arbitrary or discriminatory decisions are prohibited.</li>
                            <li><strong className="text-gray-200">Prize Fulfillment:</strong> If your tournament offers prizes, you are solely responsible for fulfilling all prize obligations to winners in a timely manner. Esportra is not responsible for prize fulfillment by organizers.</li>
                            <li><strong className="text-gray-200">Compliance:</strong> You agree to comply with all applicable laws and regulations, including those related to contests, sweepstakes, gaming, taxes, and consumer protection in your jurisdiction.</li>
                            <li><strong className="text-gray-200">Liability:</strong> You agree to indemnify Esportra against any claims, damages, or liabilities arising from your operation, administration, or misadministration of tournaments or events.</li>
                            <li><strong className="text-gray-200">Verification:</strong> We may require additional identity or organizational verification before granting organizer privileges. We reserve the right to deny or revoke organizer status at our discretion.</li>
                        </ul>
                    </section>

                    {/* ── 7. Sponsor & Partner Terms ── */}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-rose-500 font-mono text-lg">07.</span> Additional Terms for Sponsors & Partners
                        </h2>
                        <p className="text-gray-400 mb-3">
                            If you use the Platform as a sponsor or advertising partner through our partner portal, the following additional terms apply:
                        </p>
                        <ul className="list-disc list-inside space-y-2 ml-4 text-gray-400">
                            <li><strong className="text-gray-200">Ad Content:</strong> All advertising content must comply with applicable advertising laws and regulations, must not be misleading or deceptive, and must conform to our advertising content guidelines.</li>
                            <li><strong className="text-gray-200">Creative Assets:</strong> You represent and warrant that you own or have all necessary rights to use the creative assets (images, logos, copy) submitted for your campaigns.</li>
                            <li><strong className="text-gray-200">Prohibited Content:</strong> Advertisements for illegal products or services, gambling (unless legally permitted and authorized), tobacco, weapons, adult content, or any content that is harmful, misleading, or inappropriate for our audience are strictly prohibited.</li>
                            <li><strong className="text-gray-200">Metrics & Reporting:</strong> We will provide impression and engagement metrics for your campaigns. While we strive for accuracy, we do not guarantee the precision of advertising metrics and cannot be held liable for discrepancies.</li>
                            <li><strong className="text-gray-200">Payment:</strong> Advertising fees, if applicable, are due according to the terms agreed upon in your advertising agreement. Failure to pay may result in campaign suspension or account termination.</li>
                            <li><strong className="text-gray-200">Approval:</strong> We reserve the right to review, approve, reject, or remove any advertising content at our sole discretion.</li>
                        </ul>
                    </section>

                    {/* ── 8. Fees & Payments ── */}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-rose-500 font-mono text-lg">08.</span> Fees & Payments
                        </h2>
                        <ul className="list-disc list-inside space-y-2 ml-4 text-gray-400">
                            <li>The Esportra Platform is currently free to use for players and tournament organizers.</li>
                            <li>We reserve the right to introduce paid features, premium subscriptions, or service fees in the future. Any such changes will be communicated with at least 30 days' advance notice.</li>
                            <li>If paid features are introduced, specific pricing and payment terms will be clearly communicated before any charges are applied.</li>
                            <li>Tournament organizers who set entry fees are solely responsible for collecting, managing, and accounting for those fees in compliance with applicable laws.</li>
                            <li>Esportra is not a payment processor for tournament entry fees or prize disbursements unless explicitly stated in a separate agreement.</li>
                        </ul>
                        <div className="mt-4 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                            <p className="text-amber-400 font-semibold text-sm mb-1">⚠️ Important Notice</p>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                Esportra is <strong className="text-gray-200">not responsible</strong> for any manual payments collected by tournament organizers as entry fees, nor for the disbursement of any promised winning prizes. All financial arrangements between organizers and participants — including entry fee collection, prize pool management, and prize distribution — are solely between the organizer and the participants. Esportra bears no liability for any failure, delay, or dispute arising from such transactions.
                            </p>
                        </div>
                    </section>

                    {/* ── 9. Disclaimers & Limitation of Liability ── */}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-rose-500 font-mono text-lg">09.</span> Disclaimers & Limitation of Liability
                        </h2>

                        <h3 className="text-lg font-semibold text-white mb-2 mt-4">9.1 &quot;As Is&quot; and &quot;As Available&quot;</h3>
                        <p className="text-gray-400 mb-3 uppercase text-xs tracking-wide leading-relaxed">
                            THE PLATFORM IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE. TO THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE PLATFORM WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS.
                        </p>

                        <h3 className="text-lg font-semibold text-white mb-2 mt-4">9.2 Limitation of Liability</h3>
                        <p className="text-gray-400 mb-3 uppercase text-xs tracking-wide leading-relaxed">
                            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL ESPORTRA, ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, PARTNERS, SUPPLIERS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES, INCLUDING BUT NOT LIMITED TO DAMAGES FOR LOSS OF PROFITS, GOODWILL, DATA, COMPETITIVE STANDING, TOURNAMENT RESULTS, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF OR INABILITY TO USE THE PLATFORM, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
                        </p>
                        <p className="text-gray-400 mb-3 uppercase text-xs tracking-wide leading-relaxed">
                            OUR TOTAL AGGREGATE LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THESE TERMS OR THE PLATFORM SHALL NOT EXCEED THE GREATER OF (A) THE AMOUNTS YOU HAVE PAID TO ESPORTRA IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR (B) ONE HUNDRED U.S. DOLLARS ($100.00).
                        </p>

                        <h3 className="text-lg font-semibold text-white mb-2 mt-4">9.3 Specific Disclaimers</h3>
                        <ul className="list-disc list-inside space-y-2 ml-4 text-gray-400">
                            <li>We are not responsible for the conduct of any user, organizer, or third party on or off the Platform.</li>
                            <li>While we strive for accuracy in tournament results, leaderboard rankings, and player statistics, occasional discrepancies may occur due to technical issues, reporting errors, or dispute outcomes. We work to resolve any inaccuracies promptly when identified.</li>
                            <li>We are not responsible for the fulfillment of prizes offered by tournament organizers.</li>
                            <li>We are not responsible for any loss of data, competitive progress, or account information due to technical failures.</li>
                            <li>While we vet advertising partners and sponsored content displayed on the Platform, the inclusion of such content does not constitute a guarantee or endorsement of the quality, safety, or suitability of any third-party products or services. We are not liable for any transactions, experiences, or outcomes resulting from your interactions with third-party advertisers or sponsors.</li>
                            <li>We are not responsible for any disputes between users that arise outside of our formal dispute resolution system.</li>
                        </ul>
                    </section>

                    {/* ── 10. Indemnification ── */}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-rose-500 font-mono text-lg">10.</span> Indemnification
                        </h2>
                        <p className="text-gray-400">
                            You agree to indemnify, defend, and hold harmless Esportra and its officers, directors, employees, agents, partners, suppliers, and affiliates from and against any and all claims, demands, damages, losses, costs, liabilities, and expenses (including reasonable attorneys' fees) arising out of or relating to: (a) your use of the Platform; (b) your violation of these Terms or any applicable law or regulation; (c) your User Content; (d) your violation of any rights of any third party; (e) your conduct in connection with any tournament, team, or competition on the Platform; or (f) any misrepresentation made by you. This indemnification obligation will survive the termination of your account and these Terms.
                        </p>
                    </section>

                    {/* ── 11. Dispute Resolution ── */}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-rose-500 font-mono text-lg">11.</span> Dispute Resolution
                        </h2>

                        <h3 className="text-lg font-semibold text-white mb-2 mt-4">11.1 In-Platform Disputes (Tournament/Match)</h3>
                        <p className="text-gray-400 mb-3">
                            Disputes regarding tournament match results, disqualifications, or rule violations must first be submitted through our in-platform dispute resolution system. Decisions made through this system by tournament administrators and Esportra staff are final and binding as they relate to competitive outcomes on the Platform.
                        </p>

                        <h3 className="text-lg font-semibold text-white mb-2 mt-4">11.2 Informal Resolution</h3>
                        <p className="text-gray-400 mb-3">
                            For disputes between you and Esportra regarding these Terms or the Platform, you agree to first attempt to resolve the dispute informally by contacting us at{' '}
                            <a href="mailto:operations@esportra.com" className="text-rose-400 hover:text-rose-300 underline underline-offset-2">operations@esportra.com</a>.
                            We will attempt to resolve your concern within 30 days.
                        </p>

                        <h3 className="text-lg font-semibold text-white mb-2 mt-4">11.3 Binding Arbitration</h3>
                        <p className="text-gray-400 mb-3">
                            If informal resolution fails, any dispute, controversy, or claim arising out of or relating to these Terms shall be settled by binding arbitration administered by a recognized arbitration body under its applicable rules. The arbitration shall be conducted in the English language. The arbitrator's decision shall be final and binding, and judgment upon the award may be entered in any court of competent jurisdiction.
                        </p>

                        <h3 className="text-lg font-semibold text-white mb-2 mt-4">11.4 Class Action Waiver</h3>
                        <p className="text-gray-400 mb-3 uppercase text-xs tracking-wide leading-relaxed">
                            YOU AND ESPORTRA AGREE THAT EACH PARTY MAY ONLY BRING CLAIMS AGAINST THE OTHER IN AN INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS, CONSOLIDATED, OR REPRESENTATIVE ACTION. THE ARBITRATOR MAY NOT CONSOLIDATE MORE THAN ONE PERSON'S CLAIMS AND MAY NOT PRESIDE OVER ANY FORM OF CLASS OR REPRESENTATIVE PROCEEDING.
                        </p>

                        <h3 className="text-lg font-semibold text-white mb-2 mt-4">11.5 Exceptions</h3>
                        <p className="text-gray-400">
                            Notwithstanding the above, either party may seek injunctive or equitable relief in any court of competent jurisdiction to prevent the actual or threatened infringement, misappropriation, or violation of intellectual property rights.
                        </p>
                    </section>

                    {/* ── 12. Termination ── */}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-rose-500 font-mono text-lg">12.</span> Termination
                        </h2>

                        <h3 className="text-lg font-semibold text-white mb-2 mt-4">12.1 Termination by You</h3>
                        <p className="text-gray-400 mb-3">
                            You may terminate your account at any time by contacting us at{' '}
                            <a href="mailto:operations@esportra.com" className="text-rose-400 hover:text-rose-300 underline underline-offset-2">operations@esportra.com</a>{' '}
                            or through account settings. Upon termination, your right to use the Platform will immediately cease. Deletion of your data will be handled in accordance with our{' '}
                            <Link to="/privacy" className="text-rose-400 hover:text-rose-300 underline underline-offset-2">Privacy Policy</Link>.
                        </p>

                        <h3 className="text-lg font-semibold text-white mb-2 mt-4">12.2 Termination by Esportra</h3>
                        <p className="text-gray-400 mb-3">We may suspend or terminate your account, at our sole discretion, with or without notice, for any reason, including but not limited to:</p>
                        <ul className="list-disc list-inside space-y-2 ml-4 text-gray-400">
                            <li>Violation of these Terms or any applicable policies.</li>
                            <li>Engaging in cheating, match-fixing, or other competitive integrity violations.</li>
                            <li>Engaging in harassment, abuse, or any harmful conduct toward other users.</li>
                            <li>Providing false or misleading information.</li>
                            <li>Failure to comply with applicable laws or regulations.</li>
                            <li>Extended period of inactivity (accounts inactive for more than 24 months may be deactivated).</li>
                            <li>Requests from law enforcement or government agencies.</li>
                            <li>Discontinuation or material modification of the Platform.</li>
                        </ul>

                        <h3 className="text-lg font-semibold text-white mb-2 mt-4">12.3 Effect of Termination</h3>
                        <p className="text-gray-400">
                            Upon termination, all rights and licenses granted to you under these Terms will immediately cease. Sections that by their nature should survive termination will continue to apply, including but not limited to: Intellectual Property, Disclaimers, Limitation of Liability, Indemnification, Dispute Resolution, and Governing Law.
                        </p>
                    </section>

                    {/* ── 13. Modifications to Terms ── */}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-rose-500 font-mono text-lg">13.</span> Modifications to Terms
                        </h2>
                        <p className="text-gray-400">
                            We reserve the right to modify, amend, or replace these Terms at any time. Material changes will be communicated by posting an updated version on the Platform with a revised &quot;Last updated&quot; date, and by providing notice through email, in-app notification, or other appropriate means at least 30 days before the changes take effect. Your continued use of the Platform after the effective date constitutes acceptance of the modified Terms. If you do not agree to the modified Terms, you must discontinue use of the Platform and terminate your account.
                        </p>
                    </section>

                    {/* ── 14. Platform Availability & Modifications ── */}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-rose-500 font-mono text-lg">14.</span> Platform Availability & Modifications
                        </h2>
                        <ul className="list-disc list-inside space-y-2 ml-4 text-gray-400">
                            <li>We reserve the right to modify, update, suspend, or discontinue any aspect of the Platform at any time, with or without notice.</li>
                            <li>We may perform scheduled or unscheduled maintenance that may result in temporary unavailability of the Platform or certain features.</li>
                            <li>We do not guarantee that the Platform will be available at all times or in all locations.</li>
                            <li>We are not liable for any damage or inconvenience resulting from periods of unavailability, including during tournaments.</li>
                            <li>We may impose limits on certain features or restrict access to parts of the Platform without notice or liability.</li>
                        </ul>
                    </section>

                    {/* ── 15. Governing Law ── */}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-rose-500 font-mono text-lg">15.</span> Governing Law
                        </h2>
                        <p className="text-gray-400">
                            These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which Esportra operates, without regard to its conflict-of-law provisions. Any legal action or proceeding not subject to arbitration shall be brought exclusively in the courts of competent jurisdiction located within the applicable jurisdiction.
                        </p>
                    </section>

                    {/* ── 16. General Provisions ── */}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-rose-500 font-mono text-lg">16.</span> General Provisions
                        </h2>
                        <ul className="list-disc list-inside space-y-2 ml-4 text-gray-400">
                            <li><strong className="text-gray-200">Entire Agreement:</strong> These Terms, together with the Privacy Policy and any additional terms or policies referenced herein, constitute the entire agreement between you and Esportra regarding the Platform, superseding all prior or contemporaneous agreements, communications, and proposals.</li>
                            <li><strong className="text-gray-200">Severability:</strong> If any provision of these Terms is found to be unenforceable or invalid, that provision shall be modified to the minimum extent necessary to make it enforceable, and the remaining provisions shall continue in full force and effect.</li>
                            <li><strong className="text-gray-200">Waiver:</strong> Our failure to enforce any right or provision of these Terms shall not constitute a waiver of such right or provision. Any waiver must be in writing and signed by an authorized representative.</li>
                            <li><strong className="text-gray-200">Assignment:</strong> You may not assign or transfer these Terms or your rights hereunder without our prior written consent. We may assign these Terms without restriction.</li>
                            <li><strong className="text-gray-200">No Third-Party Beneficiaries:</strong> These Terms do not create any third-party beneficiary rights.</li>
                            <li><strong className="text-gray-200">Force Majeure:</strong> Esportra shall not be liable for any delay or failure to perform resulting from causes beyond our reasonable control, including but not limited to acts of God, natural disasters, war, terrorism, pandemics, government actions, internet outages, or third-party service failures.</li>
                            <li><strong className="text-gray-200">Headings:</strong> The section headings in these Terms are for convenience only and have no legal or contractual effect.</li>
                            <li><strong className="text-gray-200">Notices:</strong> We may send notices to you via email to the address associated with your account, through in-app notifications, or by posting on the Platform. You may send notices to us at <a href="mailto:operations@esportra.com" className="text-rose-400 hover:text-rose-300 underline underline-offset-2">operations@esportra.com</a>.</li>
                        </ul>
                    </section>

                    {/* ── 17. Contact ── */}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-rose-500 font-mono text-lg">17.</span> Contact Us
                        </h2>
                        <p className="text-gray-400 mb-4">
                            If you have any questions or concerns about these Terms, please contact us:
                        </p>
                        <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-3">
                            <p className="text-gray-300"><strong className="text-white">Esportra</strong></p>
                            <p className="text-gray-400">
                                General:{' '}
                                <a href="mailto:operations@esportra.com" className="text-rose-400 hover:text-rose-300 underline underline-offset-2">operations@esportra.com</a>
                            </p>
                            <p className="text-gray-400">
                                Partners:{' '}
                                <a href="mailto:management@partners.esportra.com" className="text-rose-400 hover:text-rose-300 underline underline-offset-2">management@partners.esportra.com</a>
                            </p>
                            <p className="text-gray-400">
                                Website:{' '}
                                <a href="https://esportra.com" className="text-rose-400 hover:text-rose-300 underline underline-offset-2">esportra.com</a>
                            </p>
                        </div>
                    </section>

                    {/* Acceptance */}
                    <section className="border-t border-white/10 pt-8">
                        <p className="text-gray-400 text-center italic">
                            By using Esportra, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and our{' '}
                            <Link to="/privacy" className="text-rose-400 hover:text-rose-300 underline underline-offset-2">Privacy Policy</Link>.
                        </p>
                    </section>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default TermsPage;
