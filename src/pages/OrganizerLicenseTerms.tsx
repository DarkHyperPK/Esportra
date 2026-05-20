import React from 'react';
import Footer from '@/components/Footer';
import { Link } from 'react-router-dom';
import { getWebsiteAssetUrl } from '@/lib/storage';
import { ShieldCheck, AlertTriangle, Scale, FileText, Ban, CheckCircle2 } from 'lucide-react';

const OrganizerLicenseTerms: React.FC = () => {
  return (
    <div className="min-h-screen bg-transparent text-white pt-8">
      <main className="container mx-auto px-4 pb-14 max-w-4xl">
        {/* Header */}
        <div className="mb-12">
          <Link to="/" className="inline-block mb-8">
            <img
              src={getWebsiteAssetUrl('eSportra-Logo/eSPORTRA-white-transparent.png')}
              alt="Esportra"
              className="h-8 opacity-80 hover:opacity-100 transition-opacity"
            />
          </Link>
          
          <div className="flex items-center gap-2 mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium">
              <ShieldCheck className="w-4 h-4" />
              Licensing Policy
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-white mb-3">
            Organizer License Terms &amp; Sponsorship Policy
          </h1>
          <p className="text-gray-400 text-sm">
            Last updated: April 18, 2026 &middot; Effective Date: April 18, 2026
          </p>
        </div>

        <div className="space-y-10 text-gray-300 leading-relaxed">

          {/* ── Introduction ── */}
          <section>
            <p className="text-gray-400 text-lg leading-relaxed">
              These Organizer License Terms & Sponsorship Policy ("Organizer Policy," "License Terms") constitute a
              legally binding addendum to the Esportra{' '}
              <Link to="/terms" className="text-rose-400 hover:text-rose-300 underline underline-offset-2">
                Terms of Service
              </Link>{' '}
              and govern the conduct of all individuals and entities ("Organizer," "you," "your") who hold, apply for,
              or operate under an <strong className="text-gray-200">Organizer License</strong> issued by Esportra
              ("we," "us," "our," "the Platform").
            </p>
            <p className="text-gray-400 mt-4 leading-relaxed">
              By submitting an application for an Organizer License, clicking "I Accept," or operating any tournament
              or event on the Esportra Platform under an Organizer License, you acknowledge that you have read,
              understood, and agree to be fully bound by these License Terms in their entirety. These terms exist
              to maintain a fair, professional, and commercially structured ecosystem for all participants,
              sponsors, and partners on the Platform.
            </p>

            <div className="bg-rose-500/10 border border-rose-500/20 p-4 mt-6">
              <p className="text-rose-300 text-sm font-medium flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>MANDATORY ACCEPTANCE:</strong> These License Terms must be accepted before an Organizer
                  License is granted. Failure to comply with any provision herein may result in immediate license
                  termination, removal of your tournaments from the Platform, and further action as detailed in
                  Section 7.
                </span>
              </p>
            </div>
          </section>

          {/* ── 1. Definitions ── */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-rose-500 font-mono text-lg">01.</span> Definitions
            </h2>
            <ul className="list-none space-y-3 ml-0 text-gray-400">
              <li><strong className="text-gray-200">Organizer License:</strong> The privilege, granted exclusively by Esportra, that authorizes an individual or entity to create, publish, and manage tournaments on the Esportra Platform.</li>
              <li><strong className="text-gray-200">Licensed Organizer:</strong> Any individual or entity that has been approved and holds an active Organizer License issued by Esportra.</li>
              <li><strong className="text-gray-200">Esportra Partners / Esportra Sponsors:</strong> Commercial entities that have entered into a formal sponsorship or partnership agreement with Esportra through the official Esportra Partnership Program.</li>
              <li><strong className="text-gray-200">Third-Party Sponsors:</strong> Any commercial entity, brand, or individual that has a sponsorship, partnership, or advertising relationship with the Organizer directly — and has <em>not</em> entered into a partnership agreement with Esportra.</li>
              <li><strong className="text-gray-200">Organizer Streams / Production Streams:</strong> Any live streaming or broadcast content produced by or on behalf of the Organizer in connection with tournaments hosted on the Esportra Platform, whether conducted via Twitch, YouTube, or any other streaming service.</li>
              <li><strong className="text-gray-200">Tournament Page:</strong> The dedicated tournament listing, details, bracket, and associated web pages for a given tournament, as hosted on the Esportra Platform (esportra.com).</li>
              <li><strong className="text-gray-200">Esportra Placement Zones:</strong> Designated advertising and sponsorship display areas on tournament pages, match pages, stream overlays, and other Platform surfaces, as defined by Esportra's Partner Tier structure.</li>
            </ul>
          </section>

          {/* ── 2. Sponsorship & Advertising Restrictions ── */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-rose-500 font-mono text-lg">02.</span> Sponsorship & Advertising Restrictions
            </h2>
            <p className="text-gray-400 mb-4">
              By accepting these License Terms, the Organizer agrees to the following sponsorship and advertising
              restrictions, which apply to all tournaments, events, and productions hosted on or in connection with
              the Esportra Platform:
            </p>

            <h3 className="text-lg font-semibold text-white mb-3 mt-6 flex items-center gap-2">
              <Ban className="w-5 h-5 text-rose-400" />
              2.1 Prohibition on Unauthorized Third-Party Advertising
            </h3>
            <div className="bg-[#0a0a0c] border border-white/5 p-5 space-y-3 text-gray-400 text-sm">
              <p>
                Licensed Organizers <strong className="text-gray-200">do not have the right</strong> to independently
                advertise, promote, display, or otherwise feature any Third-Party Sponsor's branding, logos,
                trademarks, promotional content, or commercial messaging on:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Their tournament pages hosted on esportra.com;</li>
                <li>Any Esportra Placement Zones, including but not limited to sidebars, card badges, headers, and stream overlays managed by the Platform;</li>
                <li>Any other surface of the Esportra Platform where Esportra-managed partner placements are displayed.</li>
              </ul>
              <p className="mt-2">
                This restriction applies regardless of any pre-existing commercial relationship between the Organizer
                and the Third-Party Sponsor.
              </p>
            </div>

            <h3 className="text-lg font-semibold text-white mb-3 mt-6 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              2.2 Permitted Third-Party Sponsorship (With Prior Written Approval)
            </h3>
            <div className="bg-[#0a0a0c] border border-white/5 p-5 space-y-3 text-gray-400 text-sm">
              <p>
                A Licensed Organizer <strong className="text-gray-200">may</strong> seek to feature a Third-Party
                Sponsor in connection with their tournament, subject to the following conditions:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  The Organizer must submit a written request to Esportra at{' '}
                  <a href="mailto:operations@esportra.com" className="text-rose-400 hover:text-rose-300 underline underline-offset-2">
                    operations@esportra.com
                  </a>{' '}
                  at least <strong className="text-gray-200">seven (7) business days</strong> prior to the intended
                  feature or publication of the Third-Party Sponsor's material.
                </li>
                <li>The request must include full details of the proposed sponsorship arrangement, including the identity of the Third-Party Sponsor, the nature of the commercial relationship, and the intended placement or promotion on the Platform.</li>
                <li>Esportra reserves the absolute right to approve or deny any Third-Party Sponsorship request at its sole discretion, including where such a sponsorship conflicts with an existing Esportra Partner relationship or is deemed contrary to the Platform's commercial interests or values.</li>
                <li>Approval, if granted, will be issued in writing by Esportra and is specific to the tournament and context for which it was requested. Approval for one event does not constitute ongoing or blanket permission.</li>
              </ul>
            </div>

            <h3 className="text-lg font-semibold text-white mb-3 mt-6">
              2.3 Esportra's Rights on Tournament Pages
            </h3>
            <div className="bg-[#0a0a0c] border border-white/5 p-5 space-y-3 text-gray-400 text-sm">
              <p>
                In exchange for being granted the Organizer License and the privilege of hosting tournaments on the
                Esportra Platform, the Licensed Organizer expressly acknowledges and agrees that:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  Esportra reserves the right to place and display its official sponsors' and partners' branding,
                  logos, promotional materials, and advertising content on the Organizer's{' '}
                  <strong className="text-gray-200">tournament pages</strong> as hosted on esportra.com, in
                  accordance with the applicable partner's tier placement rights.
                </li>
                <li>
                  These placements are managed exclusively by Esportra and will be displayed in the designated
                  Esportra Placement Zones only. Esportra will not place content that is defamatory, offensive,
                  or directly contradictory to the Organizer's stated game title or tournament format.
                </li>
              </ul>
            </div>

            <h3 className="text-lg font-semibold text-white mb-3 mt-6">
              2.4 Organizer Stream Partnership Program (Opt-In)
            </h3>
            <div className="bg-[#0a0a0c] border border-white/5 p-5 space-y-3 text-gray-400 text-sm">
              <p>
                Esportra operates a voluntary <strong className="text-gray-200">Organizer Stream Partnership Program</strong>{' '}
                through which Licensed Organizers may choose to feature Esportra's official partner assets —
                including stream overlays, branded graphics, and banner materials — in their production broadcasts
                associated with Platform tournaments.
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  Participation in the Stream Partnership Program is entirely <strong className="text-gray-200">opt-in</strong> and
                  at the Organizer's sole discretion. Esportra does not assert any right to compel, require, or
                  mandate the display of partner content on an Organizer's external streaming channel or broadcast.
                </li>
                <li>
                  Organizers who voluntarily participate may be eligible for benefits such as revenue-sharing
                  arrangements, enhanced platform visibility, priority listing, or other incentives as communicated
                  by Esportra from time to time.
                </li>
                <li>
                  Any assets provided by Esportra under this program remain the intellectual property of Esportra
                  and its partners. The Organizer may not modify, sublicense, or repurpose these assets outside of
                  the approved broadcast context without prior written consent from Esportra.
                </li>
                <li>
                  Organizers wishing to participate may contact Esportra at{' '}
                  <a href="mailto:operations@esportra.com" className="text-rose-400 hover:text-rose-300 underline underline-offset-2">
                    operations@esportra.com
                  </a>{' '}
                  to discuss eligibility and program details.
                </li>
              </ul>
            </div>
          </section>

          {/* ── 3. Platform-Wide Commercial Integrity ── */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-rose-500 font-mono text-lg">03.</span> Platform-Wide Commercial Integrity
            </h2>
            <p className="text-gray-400 mb-4">
              The Esportra Platform maintains a commercial ecosystem designed to benefit Organizers, Players, and
              Sponsors in a structured and equitable manner. To protect this ecosystem, all Licensed Organizers agree:
            </p>
            <ul className="list-disc list-inside space-y-3 ml-4 text-gray-400">
              <li>Not to use tournament names, tournament slugs, tournament pages, or any other Platform surface as an unapproved advertising vehicle for third-party commercial entities.</li>
              <li>Not to solicit, accept, or enter into any commercial arrangement with a third party that requires the display of that party's brand or content on the Esportra Platform without Esportra's prior written consent.</li>
              <li>Not to mislead or imply an official sponsorship relationship between any Third-Party Sponsor and the Esportra Platform itself.</li>
              <li>Not to undermine, compete with, or interfere with any official Esportra Partner's placement rights or commercial relationship with the Platform.</li>
              <li>To promptly disclose to Esportra, upon request, any commercial sponsorship arrangements that pertain to tournaments hosted on the Platform.</li>
            </ul>
          </section>

          {/* ── 4. Content Standards for Permitted Sponsorships ── */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-rose-500 font-mono text-lg">04.</span> Content Standards for Permitted Sponsorships
            </h2>
            <p className="text-gray-400 mb-4">
              Where Esportra grants written approval for a Third-Party Sponsorship under Section 2.2, the content
              of all approved sponsorship material must:
            </p>
            <ul className="list-disc list-inside space-y-3 ml-4 text-gray-400">
              <li>Comply with all applicable advertising laws and regulations in the relevant jurisdiction.</li>
              <li>Not promote products or services that are illegal, harmful, adult in nature, or otherwise prohibited under the Esportra Terms of Service (including gambling, tobacco, weapons, or adult entertainment).</li>
              <li>Not contain content that is defamatory, discriminatory, harassing, politically extreme, or otherwise objectionable as determined by Esportra in its sole discretion.</li>
              <li>Not make claims or representations that are false, misleading, or deceptive.</li>
              <li>Not infringe upon the intellectual property rights, trademarks, or other proprietary rights of any third party, including Esportra.</li>
              <li>Be presented in a manner that clearly distinguishes it from Esportra's official partner content and does not imply an official relationship with Esportra.</li>
            </ul>
          </section>

          {/* ── 5. License Grant & Scope ── */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-rose-500 font-mono text-lg">05.</span> License Grant & Scope
            </h2>
            <p className="text-gray-400 mb-4">
              Subject to the Organizer's continued compliance with these License Terms and the Esportra Terms of
              Service, Esportra grants the Organizer a limited, non-exclusive, non-transferable, revocable license to:
            </p>
            <ul className="list-disc list-inside space-y-3 ml-4 text-gray-400">
              <li>Create, publish, and manage tournaments on the Esportra Platform.</li>
              <li>Access the Organizer Dashboard and related administrative tools.</li>
              <li>List and manage tournament brackets, schedules, results, and player registrations.</li>
              <li>Feature Esportra branding and tournament listing within the Organizer's own promotional materials and social media, subject to Esportra's branding guidelines.</li>
            </ul>
            <p className="text-gray-400 mt-4">
              This license does <strong className="text-gray-200">not</strong> grant the Organizer any ownership
              interest in the Platform, any right to sublicense the Organizer License, or any right to use the
              Esportra name, logo, or trademarks beyond what is expressly permitted in writing by Esportra.
            </p>
          </section>

          {/* ── 6. Organizer Representations & Warranties ── */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-rose-500 font-mono text-lg">06.</span> Organizer Representations & Warranties
            </h2>
            <p className="text-gray-400 mb-4">
              By accepting these License Terms, the Organizer represents, warrants, and covenants that:
            </p>
            <ul className="list-disc list-inside space-y-3 ml-4 text-gray-400">
              <li>They have the full legal authority to enter into these License Terms on behalf of themselves and, if applicable, the organization they represent.</li>
              <li>All information provided during the license application process is accurate, complete, and up-to-date.</li>
              <li>They have read, understood, and agree to be bound by the Esportra Terms of Service, Privacy Policy, and these Organizer License Terms.</li>
              <li>They will administer all tournaments in a fair, transparent, and professional manner consistent with the published tournament rules.</li>
              <li>They will not engage in any conduct that brings the Esportra Platform into disrepute or compromises the competitive integrity of any event hosted on the Platform.</li>
              <li>They will not feature, display, or otherwise promote any Third-Party Sponsors on the Platform without prior written approval from Esportra, as detailed in Section 2.</li>
            </ul>
          </section>

          {/* ── 7. Violations & Enforcement ── */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-rose-500 font-mono text-lg">07.</span> Violations & Enforcement
            </h2>

            <div className="bg-rose-500/5 border border-rose-500/20 p-5 mb-6">
              <p className="text-amber-400 font-semibold text-sm mb-1 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Important Notice on Violations
              </p>
              <p className="text-gray-400 text-sm leading-relaxed">
                Any violation of these License Terms — including but not limited to the unauthorized display of
                Third-Party Sponsor content — will be treated as a material breach of the Organizer License
                and may result in immediate and irreversible enforcement actions.
              </p>
            </div>

            <h3 className="text-lg font-semibold text-white mb-3 mt-4">7.1 Enforcement Actions</h3>
            <p className="text-gray-400 mb-3">
              Upon determining, at its sole discretion, that a violation of these License Terms has occurred,
              Esportra reserves the right to take any or all of the following actions:
            </p>
            <ul className="list-disc list-inside space-y-3 ml-4 text-gray-400">
              <li><strong className="text-gray-200">Immediate License Suspension:</strong> The Organizer's license may be suspended with immediate effect, pending investigation and review.</li>
              <li><strong className="text-gray-200">Permanent License Termination:</strong> The Organizer's license may be permanently revoked, removing all organizer privileges and access from the Platform.</li>
              <li>
                <strong className="text-gray-200">Tournament Removal:</strong> Any tournament hosted by the Organizer that is associated with the violation — or all active and upcoming tournaments under the Organizer's account — may be removed from the Platform without prior notice. In the event of removal, Esportra's liability to the Organizer, participating players, or any third party is expressly disclaimed to the maximum extent permitted by law.
              </li>
              <li><strong className="text-gray-200">Account Termination:</strong> The Organizer's Esportra account may be permanently terminated in accordance with Section 12 of the Esportra Terms of Service.</li>
              <li><strong className="text-gray-200">Legal Action:</strong> Esportra reserves the right to pursue all available legal remedies, including injunctive relief and damages, for material breaches of these License Terms that cause or threaten harm to the Platform's commercial interests or reputation.</li>
            </ul>

            <h3 className="text-lg font-semibold text-white mb-3 mt-6">7.2 No Obligation to Warn</h3>
            <p className="text-gray-400">
              Esportra is under no obligation to provide advance warning or a cure period before taking enforcement
              action in cases of serious or repeated violations of these License Terms, including unauthorized
              Third-Party Sponsorship advertising. However, Esportra may, at its discretion, issue a written warning
              and provide an opportunity to remedy a breach before escalating enforcement measures.
            </p>

            <h3 className="text-lg font-semibold text-white mb-3 mt-6">7.3 Reporting Violations</h3>
            <p className="text-gray-400">
              Any party who becomes aware of a potential violation of these License Terms is encouraged to report
              it to Esportra at{' '}
              <a href="mailto:operations@esportra.com" className="text-rose-400 hover:text-rose-300 underline underline-offset-2">
                operations@esportra.com
              </a>.
              Esportra will review all reports and take appropriate action at its discretion.
            </p>
          </section>

          {/* ── 8. Indemnification ── */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-rose-500 font-mono text-lg">08.</span> Indemnification
            </h2>
            <p className="text-gray-400">
              The Licensed Organizer agrees to indemnify, defend, and hold harmless Esportra and its officers,
              directors, employees, agents, partners, and affiliates from and against any and all claims, demands,
              damages, losses, costs, liabilities, and expenses (including reasonable attorneys' fees) arising out
              of or relating to: (a) the Organizer's breach of these License Terms; (b) any unauthorized
              Third-Party Sponsorship activity conducted by the Organizer on or in connection with the Platform;
              (c) the Organizer's administration or misadministration of any tournament; (d) any claims by
              Third-Party Sponsors or participants arising from actions taken or not taken by the Organizer; or
              (e) any violation of applicable law by the Organizer in connection with their use of the Organizer
              License or the Platform.
            </p>
          </section>

          {/* ── 9. Modifications to These Terms ── */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-rose-500 font-mono text-lg">09.</span> Modifications to These Terms
            </h2>
            <p className="text-gray-400">
              Esportra reserves the right to modify, amend, or update these Organizer License Terms at any time.
              Material changes will be communicated to Licensed Organizers via email, in-app notification, or by
              posting an updated version on the Platform. Continued use of the Organizer License or the Platform
              after any modification to these Terms constitutes acceptance of the updated License Terms. If an
              Organizer does not agree to the modified Terms, they must notify Esportra and cease using the
              Organizer License immediately.
            </p>
          </section>

          {/* ── 10. Governing Law & Jurisdiction ── */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-rose-500 font-mono text-lg">10.</span> Governing Law
            </h2>
            <p className="text-gray-400">
              These License Terms shall be governed by and construed in accordance with the laws of the jurisdiction
              in which Esportra operates, without regard to conflict-of-law provisions. Any disputes arising out
              of these License Terms that are not resolved through informal means shall be subject to the dispute
              resolution process set forth in the Esportra Terms of Service.
            </p>
          </section>

          {/* ── 11. Relationship to Other Terms ── */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-rose-500 font-mono text-lg">11.</span> Relationship to Other Terms
            </h2>
            <p className="text-gray-400">
              These Organizer License Terms form part of the overall legal agreement between the Organizer and
              Esportra, alongside the{' '}
              <Link to="/terms" className="text-rose-400 hover:text-rose-300 underline underline-offset-2">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-rose-400 hover:text-rose-300 underline underline-offset-2">
                Privacy Policy
              </Link>.
              In the event of any conflict between these License Terms and the general Terms of Service, these
              License Terms shall take precedence with respect to matters relating to the Organizer License and
              Organizer sponsorship activities.
            </p>
          </section>

          {/* ── Contact ── */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-rose-500 font-mono text-lg">12.</span> Contact
            </h2>
            <p className="text-gray-400 mb-4">
              For questions relating to the Organizer License or these License Terms, please contact:
            </p>
            <div className="bg-white/5 border border-white/10 p-6 space-y-3">
              <p className="text-gray-300"><strong className="text-white">Esportra Operations</strong></p>
              <p className="text-gray-400">
                Email:{' '}
                <a href="mailto:operations@esportra.com" className="text-rose-400 hover:text-rose-300 underline underline-offset-2">
                  operations@esportra.com
                </a>
              </p>
              <p className="text-gray-400">
                Website:{' '}
                <a href="https://esportra.com" className="text-rose-400 hover:text-rose-300 underline underline-offset-2">
                  esportra.com
                </a>
              </p>
            </div>
          </section>

          {/* Acceptance */}
          <section className="border-t border-white/10 pt-8">
            <div className="bg-rose-500/10 border border-rose-500/20 p-6 text-center">
              <Scale className="w-8 h-8 text-rose-400 mx-auto mb-3" />
              <p className="text-gray-300 font-semibold mb-2">Mandatory Acceptance</p>
              <p className="text-gray-400 text-sm leading-relaxed max-w-2xl mx-auto">
                By applying for or operating under an Organizer License on Esportra, you confirm that you have
                read, understood, and unconditionally agree to be bound by these Organizer License Terms &
                Sponsorship Policy, as well as the Esportra{' '}
                <Link to="/terms" className="text-rose-400 hover:text-rose-300 underline underline-offset-2">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-rose-400 hover:text-rose-300 underline underline-offset-2">
                  Privacy Policy
                </Link>.
              </p>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default OrganizerLicenseTerms;
