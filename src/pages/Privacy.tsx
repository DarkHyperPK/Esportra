import React from 'react';
import Footer from '@/components/Footer';
import { Link } from 'react-router-dom';

const PrivacyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-esports-dark text-white">
      <main className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Header */}
        <div className="mb-12">
          <Link to="/" className="inline-block mb-8">
            <img
              src="https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.website/eSportra%20Logo/eSPORTRA%20white%20transparent.png"
              alt="Esportra"
              className="h-8 opacity-80"
            />
          </Link>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-3 bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
            Privacy Policy
          </h1>
          <p className="text-gray-400 text-sm">
            Last updated: February 13, 2026 &middot; Effective Date: February 13, 2026
          </p>
        </div>

        <div className="space-y-10 text-gray-300 leading-relaxed">
          {/* ── Introduction ── */}
          <section>
            <p className="text-gray-400 text-lg leading-relaxed">
              Esportra (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting the privacy and security of your personal information. This Privacy Policy describes how we collect, use, disclose, store, and protect your information when you access or use the Esportra platform, including our website at{' '}
              <a href="https://esportra.com" className="text-rose-400 hover:text-rose-300 underline underline-offset-2">esportra.com</a>,
              our mobile applications, APIs, and any other services, features, or content we offer (collectively, the &quot;Platform&quot;).
            </p>
            <p className="text-gray-400 mt-4">
              By creating an account, accessing, or using our Platform, you acknowledge that you have read, understood, and agree to be bound by this Privacy Policy. If you do not agree with any part of this policy, you must immediately discontinue use of the Platform.
            </p>
          </section>

          {/* ── 1. Information We Collect ── */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-rose-500 font-mono text-lg">01.</span> Information We Collect
            </h2>

            <h3 className="text-lg font-semibold text-white mb-2 mt-6">1.1 Information You Provide Directly</h3>
            <p className="mb-3">When you register, use our services, or communicate with us, we may collect:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-400">
              <li><strong className="text-gray-200">Account Registration Data:</strong> Email address, username, password (stored in hashed form), full legal name, date of birth, and country of residence.</li>
              <li><strong className="text-gray-200">Profile Information:</strong> Display name, biography, avatar/profile picture, social media handles, gaming platform usernames (e.g., PlayStation Network ID, Xbox Gamertag, Steam ID, Epic Games ID, Riot ID), in-game statistics, and preferred gaming genres.</li>
              <li><strong className="text-gray-200">Team Information:</strong> Team name, team logo, team description, team roster, role assignments (Owner, Captain, Player), and team invitations history.</li>
              <li><strong className="text-gray-200">Tournament Data:</strong> Registration details, check-in records, bracket positions, match results, dispute filings, and tournament history.</li>
              <li><strong className="text-gray-200">Organization Data:</strong> Organization name, logo, description, verification documents, contact information, organizer credentials, and venue details.</li>
              <li><strong className="text-gray-200">Communication Data:</strong> Messages sent through our dispute resolution system, support tickets, feedback, survey responses, and any other content you submit.</li>
              <li><strong className="text-gray-200">Payment Information:</strong> When applicable, billing address, payment method details (processed and stored by our third-party payment processors—we do not store full credit card numbers).</li>
              <li><strong className="text-gray-200">Verification Data:</strong> Government-issued identification documents, selfies for identity verification, proof of address, and other documents submitted for account or organization verification purposes.</li>
              <li><strong className="text-gray-200">Sponsor & Partner Data:</strong> Business name, contact details, campaign configurations, creative assets, and advertising preferences submitted through our partner portal.</li>
            </ul>

            <h3 className="text-lg font-semibold text-white mb-2 mt-6">1.2 Information Collected Automatically</h3>
            <p className="mb-3">When you access or use the Platform, certain information is collected automatically by our infrastructure:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-400">
              <li><strong className="text-gray-200">Standard HTTP Data:</strong> Your browser automatically sends standard information with every request, including browser type and version, operating system, device type, screen resolution, and language preferences.</li>
              <li><strong className="text-gray-200">IP Address:</strong> Your IP address is recorded in server and authentication logs as part of standard web infrastructure operations.</li>
              <li><strong className="text-gray-200">Authentication Logs:</strong> Our infrastructure provider (Supabase) records login events, timestamps, IP addresses, and authentication method used for security and abuse prevention purposes.</li>
              <li><strong className="text-gray-200">Server Logs:</strong> API request logs including timestamps, endpoints accessed, and response codes are recorded by our hosting infrastructure for operational and debugging purposes.</li>
              <li><strong className="text-gray-200">Local Storage:</strong> We use your browser's local storage and session storage to maintain your authenticated session and user preferences (e.g., theme settings).</li>
            </ul>

            <h3 className="text-lg font-semibold text-white mb-2 mt-6">1.3 Information from Third Parties</h3>
            <p className="mb-3">We may receive information about you from third-party sources, including:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-400">
              <li><strong className="text-gray-200">Authentication Providers:</strong> When you sign in using third-party services (e.g., Google, Discord, Twitch), we receive your name, email address, and profile picture from those services.</li>
              <li><strong className="text-gray-200">Gaming Platforms:</strong> With your authorization, we may collect game statistics, rankings, match history, and achievement data from connected gaming platforms.</li>
              <li><strong className="text-gray-200">Analytics Providers:</strong> Aggregated or de-identified usage and demographic data from analytics services that help us understand how the Platform is used.</li>
              <li><strong className="text-gray-200">Publicly Available Information:</strong> Information from public esports databases, leaderboards, and social media profiles that you have made publicly available.</li>
            </ul>
          </section>

          {/* ── 2. How We Use Your Information ── */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-rose-500 font-mono text-lg">02.</span> How We Use Your Information
            </h2>
            <p className="mb-3">We use the information we collect for the following purposes:</p>

            <h3 className="text-lg font-semibold text-white mb-2 mt-4">2.1 Core Platform Operations</h3>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-400">
              <li>Creating, maintaining, and securing your account and profile.</li>
              <li>Facilitating tournament registration, matchmaking, bracket generation, check-ins, and result reporting.</li>
              <li>Managing team creation, member invitations, roster changes, and team communications.</li>
              <li>Processing and resolving tournament disputes through our dispute resolution system.</li>
              <li>Calculating and displaying leaderboard rankings, player statistics, and performance metrics.</li>
              <li>Enabling venue discovery, booking, and management for organizers.</li>
              <li>Delivering in-app notifications, email alerts, and real-time updates about matches, check-ins, and tournament activities.</li>
            </ul>

            <h3 className="text-lg font-semibold text-white mb-2 mt-4">2.2 Communication</h3>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-400">
              <li>Sending transactional emails (registration confirmations, team invitations, check-in reminders, match notifications, dispute updates).</li>
              <li>Providing customer support and responding to your inquiries and feedback.</li>
              <li>Sending promotional communications about new features, tournaments, and partner offerings (with your consent, where required by law).</li>
              <li>Notifying you of material changes to our policies or services.</li>
            </ul>

            <h3 className="text-lg font-semibold text-white mb-2 mt-4">2.3 Platform Improvement & Analytics</h3>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-400">
              <li>Analyzing usage patterns to improve Platform features, performance, and user experience.</li>
              <li>Conducting research and development to build new features and services.</li>
              <li>Generating aggregated, anonymized statistics about Platform usage, tournament participation, and competitive trends.</li>
              <li>Performing A/B testing and feature experiments to optimize the user experience.</li>
            </ul>

            <h3 className="text-lg font-semibold text-white mb-2 mt-4">2.4 Advertising & Sponsorships</h3>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-400">
              <li>Displaying relevant advertisements and sponsor content based on your interests, location, and usage patterns.</li>
              <li>Tracking advertisement impressions, clicks, and conversions for our sponsors and advertising partners.</li>
              <li>Measuring the effectiveness of advertising campaigns and providing aggregated analytics to sponsors.</li>
            </ul>

            <h3 className="text-lg font-semibold text-white mb-2 mt-4">2.5 Safety, Security & Compliance</h3>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-400">
              <li>Detecting, preventing, and investigating fraud, cheating, multi-accounting, and other violations of our Terms of Service.</li>
              <li>Verifying user identity and ensuring the integrity of competitive results.</li>
              <li>Enforcing our policies, including anti-cheat measures and fair play guidelines.</li>
              <li>Complying with applicable laws, regulations, and legal processes.</li>
              <li>Protecting the rights, property, and safety of Esportra, our users, and the public.</li>
            </ul>
          </section>

          {/* ── 3. Legal Bases for Processing ── */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-rose-500 font-mono text-lg">03.</span> Legal Bases for Processing (EEA/UK Users)
            </h2>
            <p className="mb-3">If you are in the European Economic Area (EEA) or the United Kingdom, we process your personal data based on the following legal grounds:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-400">
              <li><strong className="text-gray-200">Performance of a Contract:</strong> Processing necessary to provide and operate the Platform as described in our Terms of Service (e.g., account management, tournament operations, team features).</li>
              <li><strong className="text-gray-200">Legitimate Interests:</strong> Processing necessary for our legitimate business interests, such as improving the Platform, fraud prevention, security, analytics, and advertising, provided these interests do not override your fundamental rights and freedoms.</li>
              <li><strong className="text-gray-200">Consent:</strong> Where you have given explicit consent for specific processing activities, such as receiving marketing emails or the use of certain cookies and tracking technologies.</li>
              <li><strong className="text-gray-200">Legal Obligation:</strong> Processing necessary to comply with applicable legal obligations, such as tax reporting, regulatory requirements, or responding to valid legal requests.</li>
            </ul>
          </section>

          {/* ── 4. Game Data & Opt-In Policy ── */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-rose-500 font-mono text-lg">04.</span> Game Data & Opt-In Policy
            </h2>
            <p className="mb-3">
              We respect your right to control your gaming identity. Our Platform interacts with third-party game developer APIs (such as Riot Games) to provide tournament functionality and statistics. This data collection is strictly <strong>opt-in</strong>:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-400">
              <li><strong className="text-gray-200">Voluntary Linking:</strong> We only collect, process, or display detailed gameplay statistics (e.g., KDA, match history, rank) for users who have explicitly chosen to link their game accounts (e.g., via Riot Sign-On) to the Platform.</li>
              <li><strong className="text-gray-200">Public Visibility:</strong> By linking your game account, you consent to having your game statistics displayed publicly on tournament brackets, match pages, and leaderboards associated with our events.</li>
              <li><strong className="text-gray-200">Revocation:</strong> You may unlink your game account at any time through your profile settings. Once unlinked, we will cease updating your statistics.</li>
              <li><strong className="text-gray-200">Unlinked Players:</strong> Players who have not linked their accounts will not have their individual gameplay statistics displayed.</li>
            </ul>
          </section>

          {/* ── 5. How We Share Your Information ── */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-rose-500 font-mono text-lg">05.</span> How We Share Your Information
            </h2>
            <p className="mb-4">We do not sell your personal information. We may share your information in the following circumstances:</p>

            <h3 className="text-lg font-semibold text-white mb-2 mt-4">5.1 With Other Users</h3>
            <p className="text-gray-400 mb-3">
              Certain information is visible to other users as part of the Platform's core functionality: your username, display name, avatar, team memberships, tournament history, match results, and leaderboard rankings. Profile information you choose to make public will be accessible to all Platform visitors.
            </p>

            <h3 className="text-lg font-semibold text-white mb-2 mt-4">5.2 With Tournament Organizers</h3>
            <p className="text-gray-400 mb-3">
              When you register for a tournament, the organizer may access your username, gamertag, team affiliation, check-in status, and match results to administer the tournament.
            </p>

            <h3 className="text-lg font-semibold text-white mb-2 mt-4">5.3 With Service Providers</h3>
            <p className="text-gray-400 mb-3">We engage trusted third-party service providers to perform functions on our behalf, including:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-400">
              <li><strong className="text-gray-200">Cloud Infrastructure:</strong> Database hosting, authentication, real-time services, and file storage.</li>
              <li><strong className="text-gray-200">Email Delivery:</strong> Transactional email services for notifications, invitations, and account-related communications.</li>
              <li><strong className="text-gray-200">Hosting & Content Delivery:</strong> Web application hosting and content delivery networks.</li>
              <li><strong className="text-gray-200">Payment Processors:</strong> Secure payment processing (when applicable).</li>
            </ul>
            <p className="text-gray-400 mt-2">
              These providers are contractually bound to use your data only as necessary to perform services on our behalf and are obligated to maintain the confidentiality and security of your information.
            </p>

            <h3 className="text-lg font-semibold text-white mb-2 mt-4">5.4 With Sponsors & Advertising Partners</h3>
            <p className="text-gray-400 mb-3">
              We may share aggregated, anonymized, or de-identified data with our sponsors and advertising partners for campaign measurement and reporting purposes. We do not share your personal information with advertisers without your explicit consent.
            </p>

            <h3 className="text-lg font-semibold text-white mb-2 mt-4">5.5 For Legal & Safety Reasons</h3>
            <p className="text-gray-400 mb-3">We may disclose your information if we believe in good faith that disclosure is necessary to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-400">
              <li>Comply with applicable law, regulation, legal process, or governmental request.</li>
              <li>Enforce our Terms of Service or other agreements.</li>
              <li>Protect the safety, rights, or property of Esportra, our users, or the public.</li>
              <li>Detect, prevent, or address fraud, security vulnerabilities, or technical issues.</li>
              <li>Respond to an emergency involving danger of death or serious physical injury.</li>
            </ul>

            <h3 className="text-lg font-semibold text-white mb-2 mt-4">5.6 Business Transfers</h3>
            <p className="text-gray-400">
              In the event of a merger, acquisition, reorganization, bankruptcy, or sale of all or a portion of our assets, your information may be transferred as part of that transaction. We will notify you via email and/or a prominent notice on our Platform of any change in ownership or use of your personal information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-rose-500 font-mono text-lg">06.</span> Local Storage & Session Data
            </h2>
            <p className="mb-4">We use your browser&apos;s local storage and session storage (not traditional cookies) to operate the Platform:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-400">
              <li><strong className="text-gray-200">Authentication Tokens:</strong> We store session tokens in your browser&apos;s local storage to keep you signed in. These are essential for the Platform to function and are cleared when you sign out.</li>
              <li><strong className="text-gray-200">User Preferences:</strong> Settings such as theme preferences may be stored locally in your browser.</li>
            </ul>
            <p className="mt-4 text-gray-400">
              We do not currently use analytics cookies, advertising pixels, or third-party tracking technologies. If we introduce such technologies in the future, we will update this policy and provide appropriate notice and controls.
            </p>
          </section>

          {/* ── 6. Data Retention ── */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-rose-500 font-mono text-lg">07.</span> Data Retention
            </h2>
            <p className="mb-3">We retain your personal information for as long as necessary to fulfill the purposes described in this Privacy Policy, unless a longer retention period is required or permitted by law. Specifically:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-400">
              <li><strong className="text-gray-200">Account Data:</strong> Retained for the duration of your account's existence plus 30 days after deletion to allow for recovery, and then permanently deleted within 90 days.</li>
              <li><strong className="text-gray-200">Tournament & Competition Data:</strong> Match results, rankings, and competitive records may be retained indefinitely as part of the public competitive record, even after account deletion, in anonymized or pseudonymized form.</li>
              <li><strong className="text-gray-200">Communication Records:</strong> Support tickets and dispute records are retained for up to 3 years for quality assurance and legal compliance.</li>
              <li><strong className="text-gray-200">Server Logs:</strong> Automatically deleted after 90 days.</li>
              <li><strong className="text-gray-200">Analytics Data:</strong> Aggregated and anonymized analytics data may be retained indefinitely.</li>
              <li><strong className="text-gray-200">Advertising Data:</strong> Impression and engagement data is retained for 2 years for reporting purposes, after which it is aggregated and anonymized.</li>
              <li><strong className="text-gray-200">Verification Documents:</strong> Identity verification documents are securely deleted within 30 days after verification is completed or denied.</li>
            </ul>
          </section>

          {/* ── 8. Data Security ── */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-rose-500 font-mono text-lg">08.</span> Data Security
            </h2>
            <p className="mb-3">We implement industry-standard technical and organizational measures to protect your personal information, including:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-400">
              <li><strong className="text-gray-200">Encryption:</strong> All data is encrypted in transit using TLS 1.2+ and at rest using AES-256 encryption.</li>
              <li><strong className="text-gray-200">Access Controls:</strong> Role-based access controls (RBAC) and Row-Level Security (RLS) policies ensure that users can only access data they are authorized to view.</li>
              <li><strong className="text-gray-200">Authentication:</strong> Secure password hashing using bcrypt, session management with JWTs, and optional multi-factor authentication.</li>
              <li><strong className="text-gray-200">Infrastructure:</strong> Our Platform is hosted on enterprise-grade cloud infrastructure with SOC 2 Type II certified providers, regular security audits, and automated vulnerability scanning.</li>
              <li><strong className="text-gray-200">Monitoring:</strong> Continuous monitoring for unauthorized access, anomalous activity, and security threats with automated alerting.</li>
              <li><strong className="text-gray-200">Incident Response:</strong> We maintain a comprehensive incident response plan and will notify affected users and relevant authorities of any data breach in accordance with applicable laws.</li>
            </ul>
            <p className="mt-4 text-gray-400">
              While we strive to protect your information, no method of electronic transmission or storage is 100% secure. We cannot guarantee absolute security, but we are committed to promptly addressing any security incidents.
            </p>
          </section>

          {/* ── 8. Your Rights & Choices ── */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-rose-500 font-mono text-lg">09.</span> Your Rights & Choices
            </h2>
            <p className="mb-3">Depending on your jurisdiction, you may have the following rights regarding your personal information:</p>

            <h3 className="text-lg font-semibold text-white mb-2 mt-4">9.1 Access & Portability</h3>
            <p className="text-gray-400 mb-3">
              You have the right to request a copy of the personal information we hold about you in a structured, commonly used, and machine-readable format (e.g., JSON or CSV). You may also request that we transfer your data directly to another service provider, where technically feasible.
            </p>

            <h3 className="text-lg font-semibold text-white mb-2 mt-4">9.2 Correction</h3>
            <p className="text-gray-400 mb-3">
              You have the right to request correction of inaccurate or incomplete personal information. You can update most account and profile information directly through your account settings.
            </p>

            <h3 className="text-lg font-semibold text-white mb-2 mt-4">9.3 Deletion</h3>
            <p className="text-gray-400 mb-3">
              You have the right to request deletion of your personal information, subject to certain exceptions (e.g., legal obligations, legitimate business interests, ongoing disputes). Upon account deletion, we will remove your personal data within 90 days, though anonymized competitive records may be retained.
            </p>

            <h3 className="text-lg font-semibold text-white mb-2 mt-4">9.4 Restriction & Objection</h3>
            <p className="text-gray-400 mb-3">
              You have the right to restrict or object to certain processing of your personal data, including processing based on legitimate interests and processing for direct marketing purposes.
            </p>

            <h3 className="text-lg font-semibold text-white mb-2 mt-4">9.5 Withdraw Consent</h3>
            <p className="text-gray-400 mb-3">
              Where we rely on your consent for processing, you have the right to withdraw that consent at any time. Withdrawal of consent does not affect the lawfulness of processing conducted prior to withdrawal.
            </p>

            <h3 className="text-lg font-semibold text-white mb-2 mt-4">9.6 Non-Discrimination</h3>
            <p className="text-gray-400 mb-3">
              We will not discriminate against you for exercising any of your privacy rights. You will not receive different pricing, quality of service, or levels of access for exercising your rights.
            </p>

            <div className="bg-white/5 border border-white/10 rounded-lg p-4 mt-4">
              <p className="text-gray-300 text-sm">
                <strong className="text-white">To exercise your rights:</strong> Send a request to{' '}
                <a href="mailto:operations@esportra.com" className="text-rose-400 hover:text-rose-300 underline underline-offset-2">operations@esportra.com</a>{' '}
                or through our <Link to="/contact" className="text-rose-400 hover:text-rose-300 underline underline-offset-2">Contact page</Link>.
                We will respond to verified requests within 30 days (or as required by applicable law). We may need to verify your identity before processing your request.
              </p>
            </div>
          </section>

          {/* ── 9. International Data Transfers ── */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-rose-500 font-mono text-lg">10.</span> International Data Transfers
            </h2>
            <p className="text-gray-400">
              Esportra operates globally, and your information may be transferred to, stored, and processed in countries other than your country of residence, including the United States and other jurisdictions where our service providers operate. These countries may have data protection laws that differ from those in your jurisdiction. When we transfer personal information internationally, we implement appropriate safeguards in accordance with applicable law, including Standard Contractual Clauses (SCCs) approved by the European Commission, adequacy decisions, or other legally recognized transfer mechanisms.
            </p>
          </section>

          {/* ── 10. Children's Privacy ── */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-rose-500 font-mono text-lg">11.</span> Children&apos;s Privacy
            </h2>
            <p className="text-gray-400 mb-3">
              The Esportra Platform is not directed to children under the age of 13 (or the minimum age required in your jurisdiction). We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided personal information to us, please contact us at{' '}
              <a href="mailto:operations@esportra.com" className="text-rose-400 hover:text-rose-300 underline underline-offset-2">operations@esportra.com</a>.
            </p>
            <p className="text-gray-400">
              Users between the ages of 13 and 18 (or the age of majority in their jurisdiction) may use the Platform only with the consent and supervision of a parent or legal guardian who agrees to be bound by these terms. We reserve the right to request proof of parental consent at any time.
            </p>
          </section>

          {/* ── 11. California Privacy Rights (CCPA/CPRA) ── */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-rose-500 font-mono text-lg">12.</span> California Privacy Rights (CCPA/CPRA)
            </h2>
            <p className="text-gray-400 mb-3">
              If you are a California resident, you have the following additional rights under the California Consumer Privacy Act (CCPA) and the California Privacy Rights Act (CPRA):
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-gray-400">
              <li><strong className="text-gray-200">Right to Know:</strong> You may request disclosure of the categories and specific pieces of personal information we have collected, the sources from which it was collected, the business purposes for collection, and the categories of third parties with whom we share it.</li>
              <li><strong className="text-gray-200">Right to Delete:</strong> You may request deletion of your personal information, subject to statutory exceptions.</li>
              <li><strong className="text-gray-200">Right to Correct:</strong> You may request correction of inaccurate personal information.</li>
              <li><strong className="text-gray-200">Right to Opt-Out of Sale/Sharing:</strong> We do not sell your personal information. We do not share your personal information for cross-context behavioral advertising purposes.</li>
              <li><strong className="text-gray-200">Right to Limit Use of Sensitive Information:</strong> You may limit our use of sensitive personal information to purposes necessary to provide the services.</li>
            </ul>
            <p className="mt-3 text-gray-400">
              To exercise these rights, contact us at{' '}
              <a href="mailto:operations@esportra.com" className="text-rose-400 hover:text-rose-300 underline underline-offset-2">operations@esportra.com</a>.
              You may also designate an authorized agent to make requests on your behalf.
            </p>
          </section>

          {/* ── 12. Do Not Track ── */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-rose-500 font-mono text-lg">13.</span> Do Not Track Signals
            </h2>
            <p className="text-gray-400">
              Some browsers transmit &quot;Do Not Track&quot; (DNT) signals. Currently, there is no universally accepted standard for how companies should respond to DNT signals. As such, we do not currently respond to DNT signals. However, we support the Global Privacy Control (GPC) signal where required by applicable law.
            </p>
          </section>

          {/* ── 13. Third-Party Links ── */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-rose-500 font-mono text-lg">14.</span> Third-Party Links & Services
            </h2>
            <p className="text-gray-400">
              The Platform may contain links to third-party websites, services, or applications (e.g., gaming platforms, social media, sponsor websites). This Privacy Policy does not apply to those third-party services. We are not responsible for the privacy practices of third-party services, and we encourage you to review their privacy policies before providing any personal information.
            </p>
          </section>

          {/* ── 14. Changes to This Policy ── */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-rose-500 font-mono text-lg">15.</span> Changes to This Policy
            </h2>
            <p className="text-gray-400">
              We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. We will notify you of material changes by posting a notice on the Platform, sending you an email, or through other appropriate means at least 30 days before the changes take effect. Your continued use of the Platform after the effective date of any changes constitutes your acceptance of the updated Privacy Policy. We encourage you to review this policy periodically.
            </p>
          </section>

          {/* ── 15. Contact Us ── */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-rose-500 font-mono text-lg">16.</span> Contact Us
            </h2>
            <p className="text-gray-400 mb-4">
              If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
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
            <p className="mt-4 text-gray-500 text-sm">
              If you are in the EEA or UK and are unsatisfied with our response, you have the right to lodge a complaint with your local data protection supervisory authority.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPage;
