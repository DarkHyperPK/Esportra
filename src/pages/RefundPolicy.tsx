import React from 'react';
import Footer from '@/components/Footer';
import { Link } from 'react-router-dom';
import { getWebsiteAssetUrl } from '@/lib/storage';

const RefundPolicyPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-transparent text-white">
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
                        Refund Policy
                    </h1>
                    <p className="text-gray-400 text-sm">
                        Last updated: May 1, 2026 &middot; Effective Date: May 1, 2026
                    </p>
                </div>

                <div className="space-y-10 text-gray-300 leading-relaxed">
                    {/* ── Introduction ── */}
                    <section>
                        <p className="text-gray-400 text-lg leading-relaxed">
                            This Refund Policy (&quot;Policy&quot;) outlines the terms and conditions under which Esportra (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) handles refunds and billing inquiries in connection with the Esportra platform, including our website at{' '}
                            <a href="https://esportra.com" className="text-rose-400 hover:text-rose-300 underline underline-offset-2">esportra.com</a>,
                            our mobile applications, APIs, and all related services (collectively, the &quot;Platform&quot;). This Policy forms part of, and is subject to, our{' '}
                            <Link to="/terms" className="text-rose-400 hover:text-rose-300 underline underline-offset-2">Terms of Service</Link>.
                        </p>

                        <div className="bg-white/5 border border-white/10 rounded-lg p-4 mt-4">
                            <p className="text-gray-300 text-sm font-medium">
                                📌 <strong>Current Platform Status:</strong> The Esportra Platform is currently <strong className="text-white">free to use</strong> for all players, tournament organizers, and venue owners. We do not currently charge any subscription fees, entry fees, or service fees. As we continue to grow, we are in the process of integrating payment processing capabilities and may introduce paid features, subscriptions, or premium services in the future. This Refund Policy has been published in anticipation of those developments and will govern all paid transactions on the Platform once they become available.
                            </p>
                        </div>
                    </section>

                    {/* ── 1. Scope & Applicability ── */}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-rose-500 font-mono text-lg">01.</span> Scope &amp; Applicability
                        </h2>
                        <p className="mb-3">When paid services are introduced on the Platform, this Policy will apply to the following categories of transactions:</p>
                        <ul className="list-disc list-inside space-y-2 ml-4 text-gray-400">
                            <li><strong className="text-gray-200">Platform Subscriptions:</strong> Any future premium plans, organizer subscriptions, venue owner subscriptions, or other recurring paid plans offered directly by Esportra.</li>
                            <li><strong className="text-gray-200">Paid Features &amp; Add-Ons:</strong> Any future one-time purchases of premium features, enhanced tournament tools, promotional boosts, or other paid enhancements provided by Esportra.</li>
                            <li><strong className="text-gray-200">Advertising &amp; Sponsorship Packages:</strong> Fees paid by sponsors or advertising partners through the Esportra Partner Portal for campaign placements and related services.</li>
                            <li><strong className="text-gray-200">Tournament Entry Fees (Platform-Processed):</strong> If and when Esportra integrates direct payment processing for tournament entry fees, refunds for such fees will be governed by this Policy in conjunction with any tournament-specific rules set by the organizer.</li>
                        </ul>

                        <div className="mt-4 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                            <p className="text-amber-400 font-semibold text-sm mb-1">⚠️ Important Distinction — Organizer-Collected Payments</p>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                This Policy does <strong className="text-gray-200">not</strong> apply to tournament entry fees, prize pools, or any other financial transactions that are collected and managed <strong className="text-gray-200">directly by tournament organizers</strong> outside of the Esportra Platform&apos;s payment system. Esportra is not a party to those transactions and bears no responsibility for refunds, disputes, or losses arising from organizer-collected fees. Any disputes regarding such payments must be resolved directly between the organizer and the participant. Please refer to{' '}
                                <Link to="/terms" className="text-rose-400 hover:text-rose-300 underline underline-offset-2">Section 08 of our Terms of Service</Link>{' '}
                                for further information.
                            </p>
                        </div>
                    </section>

                    {/* ── 2. Eligibility for Refunds ── */}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-rose-500 font-mono text-lg">02.</span> Eligibility for Refunds
                        </h2>
                        <p className="mb-4 text-gray-400">Once paid services are available on the Platform, refunds may be granted under the following circumstances:</p>

                        <h3 className="text-lg font-semibold text-white mb-2 mt-4">2.1 Subscription Services</h3>
                        <ul className="list-disc list-inside space-y-2 ml-4 text-gray-400">
                            <li><strong className="text-gray-200">Cooling-Off Period:</strong> You may request a full refund within seven (7) calendar days of your initial subscription purchase, provided you have not substantially used the premium features during that period. This cooling-off period applies only to the first subscription period and does not apply to automatic renewals.</li>
                            <li><strong className="text-gray-200">Service Unavailability:</strong> If a paid feature or service is materially unavailable or non-functional for a continuous period exceeding seventy-two (72) hours due to circumstances within our reasonable control, you may request a pro-rata credit or refund for the affected period.</li>
                            <li><strong className="text-gray-200">Billing Errors:</strong> If you are charged in error (e.g., duplicate charges, incorrect amounts, charges after cancellation), you are entitled to a full refund of the erroneous charge upon verification.</li>
                        </ul>

                        <h3 className="text-lg font-semibold text-white mb-2 mt-6">2.2 One-Time Purchases</h3>
                        <ul className="list-disc list-inside space-y-2 ml-4 text-gray-400">
                            <li>The purchased feature was not delivered or was materially defective at the time of purchase.</li>
                            <li>The purchase was made in error and the feature has not been used, activated, or consumed — and you request a refund within forty-eight (48) hours of the transaction.</li>
                            <li>A billing error resulted in an incorrect or duplicate charge.</li>
                        </ul>

                        <h3 className="text-lg font-semibold text-white mb-2 mt-6">2.3 Platform-Processed Tournament Entry Fees</h3>
                        <p className="text-gray-400 mb-3">If Esportra introduces direct payment processing for tournament entry fees, the following refund conditions will apply:</p>
                        <ul className="list-disc list-inside space-y-2 ml-4 text-gray-400">
                            <li><strong className="text-gray-200">Tournament Cancellation:</strong> If a tournament is cancelled by the organizer or by Esportra before it begins, a full refund of the entry fee will be issued to all registered participants.</li>
                            <li><strong className="text-gray-200">Withdrawal Before Start:</strong> Participants who withdraw their registration before the tournament&apos;s registration deadline or check-in period may be eligible for a refund, subject to the organizer&apos;s published tournament rules. Where no organizer refund rule is specified, a full refund will be issued for withdrawals made at least twenty-four (24) hours before the scheduled start time.</li>
                            <li><strong className="text-gray-200">Disqualification &amp; No-Shows:</strong> Participants who are disqualified for rule violations or who fail to check in are generally not eligible for a refund. Entry fees forfeited due to disqualification or no-show may be allocated to the tournament&apos;s prize pool at the organizer&apos;s discretion.</li>
                            <li><strong className="text-gray-200">Technical Issues:</strong> If a participant is unable to compete due to a verified Platform-side technical failure (not including issues with the participant&apos;s own equipment, internet connection, or the game client), we will review the situation and may issue a refund or credit at our discretion.</li>
                        </ul>

                        <h3 className="text-lg font-semibold text-white mb-2 mt-6">2.4 Advertising &amp; Sponsorship Fees</h3>
                        <ul className="list-disc list-inside space-y-2 ml-4 text-gray-400">
                            <li><strong className="text-gray-200">Pre-Campaign Cancellation:</strong> If you cancel an advertising campaign before it begins serving impressions, you may be eligible for a full refund less any applicable administrative fees.</li>
                            <li><strong className="text-gray-200">Campaign Performance:</strong> We do not guarantee specific impression counts, click-through rates, or conversion metrics. Dissatisfaction with campaign performance alone does not entitle you to a refund.</li>
                            <li><strong className="text-gray-200">Platform Error:</strong> If a technical error on our end prevents your campaign from being delivered as agreed, we will provide a pro-rata refund or credit for the undelivered portion.</li>
                        </ul>
                    </section>

                    {/* ── 3. Non-Refundable Items ── */}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-rose-500 font-mono text-lg">03.</span> Non-Refundable Items
                        </h2>
                        <p className="mb-3">The following are expressly non-refundable:</p>
                        <ul className="list-disc list-inside space-y-2 ml-4 text-gray-400">
                            <li><strong className="text-gray-200">Organizer-Collected Entry Fees &amp; Prize Pools:</strong> Any entry fees or prize pool contributions collected directly by tournament organizers outside of the Platform&apos;s payment system. Esportra does not collect, process, or manage these funds and is not responsible for their refund under any circumstances.</li>
                            <li><strong className="text-gray-200">Consumed or Activated Features:</strong> Paid features, promotional boosts, or add-ons that have been fully consumed, activated, or utilized.</li>
                            <li><strong className="text-gray-200">Services Rendered:</strong> Payments for services that have been fully delivered and completed as described.</li>
                            <li><strong className="text-gray-200">Account Termination for Violations:</strong> If your account is suspended or terminated due to violations of our <Link to="/terms" className="text-rose-400 hover:text-rose-300 underline underline-offset-2">Terms of Service</Link>, <Link to="/organizer-license-terms" className="text-rose-400 hover:text-rose-300 underline underline-offset-2">Organizer License Terms</Link>, or any other applicable policy, no refund will be issued for any remaining subscription period, unused features, entry fees, or advertising credits. Engaging in conduct that results in account termination constitutes a forfeiture of all paid benefits.</li>
                            <li><strong className="text-gray-200">Subscription Renewals:</strong> Automatic subscription renewals are non-refundable once the renewal billing cycle has commenced. It is your responsibility to cancel your subscription before the renewal date if you do not wish to continue.</li>
                            <li><strong className="text-gray-200">Disqualification or No-Show Forfeitures:</strong> Entry fees forfeited as a result of disqualification, no-show, or failure to check in for a tournament.</li>
                        </ul>
                    </section>

                    {/* ── 4. How to Request a Refund ── */}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-rose-500 font-mono text-lg">04.</span> How to Request a Refund
                        </h2>
                        <p className="mb-3">To submit a refund request, please follow these steps:</p>
                        <ul className="list-disc list-inside space-y-2 ml-4 text-gray-400">
                            <li>Send an email to{' '}
                                <a href="mailto:operations@esportra.com" className="text-rose-400 hover:text-rose-300 underline underline-offset-2">operations@esportra.com</a>{' '}
                                with the subject line <strong className="text-gray-200">&quot;Refund Request&quot;</strong> or submit a request through our{' '}
                                <Link to="/contact" className="text-rose-400 hover:text-rose-300 underline underline-offset-2">Contact page</Link>.
                            </li>
                            <li>Include the following information:
                                <ul className="list-disc list-inside space-y-1 ml-6 mt-2 text-gray-500">
                                    <li>Your registered email address and username.</li>
                                    <li>The transaction or invoice ID (if available).</li>
                                    <li>The date and amount of the charge.</li>
                                    <li>A clear description of the reason for your refund request.</li>
                                    <li>Any supporting documentation (e.g., screenshots of billing errors, evidence of service non-delivery).</li>
                                </ul>
                            </li>
                            <li>Refund requests must be submitted within <strong className="text-gray-200">thirty (30) calendar days</strong> of the original transaction date, unless otherwise specified in this Policy. Requests submitted after this window may be denied at our discretion.</li>
                        </ul>
                    </section>

                    {/* ── 5. Refund Review & Processing ── */}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-rose-500 font-mono text-lg">05.</span> Refund Review &amp; Processing
                        </h2>

                        <h3 className="text-lg font-semibold text-white mb-2 mt-4">5.1 Review Timeline</h3>
                        <p className="text-gray-400 mb-3">
                            We will acknowledge receipt of your refund request within two (2) business days and aim to complete our review within ten (10) business days. Complex cases — including those requiring investigation into billing records, payment processor data, or usage logs — may require additional time, and we will keep you informed of any delays.
                        </p>

                        <h3 className="text-lg font-semibold text-white mb-2 mt-4">5.2 Refund Method</h3>
                        <p className="text-gray-400 mb-3">
                            Approved refunds will be processed to the original payment method used for the transaction. If the original payment method is no longer available (e.g., expired card, closed account), we will work with you to identify an alternative refund method. Please allow five (5) to ten (10) business days for the refund to appear on your statement, depending on your financial institution and payment processor.
                        </p>

                        <h3 className="text-lg font-semibold text-white mb-2 mt-4">5.3 Platform Credits</h3>
                        <p className="text-gray-400 mb-3">
                            In certain cases, we may offer Platform credits in lieu of a monetary refund. Platform credits may be applied toward future paid services on the Platform. Credits are non-transferable, have no cash value, and expire twelve (12) months from the date of issuance unless otherwise stated.
                        </p>

                        <h3 className="text-lg font-semibold text-white mb-2 mt-4">5.4 Sole Discretion</h3>
                        <p className="text-gray-400">
                            All refund decisions are made at the sole and reasonable discretion of Esportra. While we strive to resolve every request fairly and in good faith, we reserve the right to deny any refund request that does not meet the eligibility criteria set forth in this Policy, that is fraudulent or abusive in nature, or that falls outside the scope of this Policy.
                        </p>
                    </section>

                    {/* ── 6. Chargebacks & Disputes ── */}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-rose-500 font-mono text-lg">06.</span> Chargebacks &amp; Payment Disputes
                        </h2>
                        <p className="text-gray-400 mb-3">
                            We strongly encourage you to contact us directly before initiating a chargeback or payment dispute through your bank or payment provider. Filing a chargeback without first contacting Esportra may result in:
                        </p>
                        <ul className="list-disc list-inside space-y-2 ml-4 text-gray-400">
                            <li>Immediate suspension of your account pending investigation.</li>
                            <li>Revocation of any active subscriptions, premium features, or ongoing services.</li>
                            <li>A hold on any pending refund requests.</li>
                        </ul>
                        <p className="text-gray-400 mt-3">
                            If you believe you have been charged in error, please reach out to us at{' '}
                            <a href="mailto:operations@esportra.com" className="text-rose-400 hover:text-rose-300 underline underline-offset-2">operations@esportra.com</a>{' '}
                            so we can investigate and resolve the matter promptly. We are committed to resolving billing issues in a fair and transparent manner, and in many cases, we can process a resolution faster than a formal chargeback process.
                        </p>
                    </section>

                    {/* ── 7. Subscription Cancellation ── */}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-rose-500 font-mono text-lg">07.</span> Subscription Cancellation
                        </h2>
                        <p className="text-gray-400 mb-3">
                            When subscription services become available, you will be able to cancel your subscription at any time through your account settings or by contacting us at{' '}
                            <a href="mailto:operations@esportra.com" className="text-rose-400 hover:text-rose-300 underline underline-offset-2">operations@esportra.com</a>.
                            Upon cancellation:
                        </p>
                        <ul className="list-disc list-inside space-y-2 ml-4 text-gray-400">
                            <li>Your subscription will remain active until the end of your current billing period. You will continue to have access to paid features until that date.</li>
                            <li>No further charges will be applied once cancellation is confirmed.</li>
                            <li>Cancellation does not entitle you to a refund for the current billing period unless you are within the cooling-off window described in Section 2.1.</li>
                            <li>Upon expiration, your account will revert to the free tier and you will lose access to any premium-exclusive features, data, or tools.</li>
                        </ul>
                        <p className="text-gray-400 mt-3">
                            We recommend cancelling at least twenty-four (24) hours before your renewal date to ensure the cancellation is processed before the next billing cycle.
                        </p>
                    </section>

                    {/* ── 8. Refund Abuse ── */}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-rose-500 font-mono text-lg">08.</span> Refund Abuse &amp; Fraud Prevention
                        </h2>
                        <p className="text-gray-400 mb-3">
                            Esportra takes the integrity of its billing and refund systems seriously. We reserve the right to investigate and take appropriate action against any pattern of behaviour that we reasonably determine to be abusive, fraudulent, or conducted in bad faith. This includes, but is not limited to:
                        </p>
                        <ul className="list-disc list-inside space-y-2 ml-4 text-gray-400">
                            <li>Repeated refund requests intended to exploit the cooling-off period or obtain services without payment.</li>
                            <li>Submitting false or misleading information in support of a refund request.</li>
                            <li>Using chargeback mechanisms to circumvent this Refund Policy.</li>
                            <li>Creating multiple accounts to repeatedly access trial or introductory pricing.</li>
                        </ul>
                        <p className="text-gray-400 mt-3">
                            Where we identify abusive refund behaviour, we may deny current and future refund requests, suspend or terminate the associated account, and pursue any additional remedies available under our{' '}
                            <Link to="/terms" className="text-rose-400 hover:text-rose-300 underline underline-offset-2">Terms of Service</Link>.
                        </p>
                    </section>

                    {/* ── 9. Regional Consumer Rights ── */}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-rose-500 font-mono text-lg">09.</span> Regional Consumer Rights
                        </h2>
                        <p className="text-gray-400 mb-3">
                            We respect and acknowledge that certain jurisdictions provide consumers with statutory rights that cannot be excluded, restricted, or waived by contract. Nothing in this Refund Policy is intended to limit or override any mandatory consumer protection rights that may apply to you under the laws of your jurisdiction, including but not limited to:
                        </p>
                        <ul className="list-disc list-inside space-y-2 ml-4 text-gray-400">
                            <li><strong className="text-gray-200">European Economic Area (EEA) &amp; United Kingdom:</strong> Consumers in the EEA or UK may have the right to withdraw from a digital content purchase within fourteen (14) days under the Consumer Rights Directive, subject to exceptions for digital content that has been accessed or downloaded with prior express consent and acknowledgment of loss of withdrawal rights.</li>
                            <li><strong className="text-gray-200">Australia:</strong> Our services come with guarantees that cannot be excluded under the Australian Consumer Law. You are entitled to a replacement or refund for a major failure and compensation for any other reasonably foreseeable loss or damage.</li>
                            <li><strong className="text-gray-200">Other Jurisdictions:</strong> If your local laws provide for additional or broader refund rights, those rights will apply to the extent they override the terms of this Policy.</li>
                        </ul>
                        <p className="text-gray-400 mt-3">
                            If you believe your statutory consumer rights entitle you to a refund that is not covered by this Policy, please contact us and we will review your request in accordance with applicable law.
                        </p>
                    </section>

                    {/* ── 10. Changes to This Policy ── */}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-rose-500 font-mono text-lg">10.</span> Changes to This Policy
                        </h2>
                        <p className="text-gray-400">
                            We may update this Refund Policy from time to time to reflect changes in our services, the introduction of paid features, legal requirements, or business practices. When paid services are introduced, this Policy will be updated with any service-specific refund terms. We will notify you of material changes by posting a revised version on the Platform with an updated &quot;Last updated&quot; date, and by providing notice through email or in-app notification at least thirty (30) days before the changes take effect. Your continued use of paid services after the effective date of any changes constitutes your acceptance of the updated Policy. We encourage you to review this Policy periodically.
                        </p>
                    </section>

                    {/* ── 11. Contact Us ── */}
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-rose-500 font-mono text-lg">11.</span> Contact Us
                        </h2>
                        <p className="text-gray-400 mb-4">
                            If you have any questions about this Refund Policy or need assistance with a billing inquiry, please contact us:
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
                            By using Esportra and making any purchase on the Platform, you acknowledge that you have read, understood, and agree to be bound by this Refund Policy, our{' '}
                            <Link to="/terms" className="text-rose-400 hover:text-rose-300 underline underline-offset-2">Terms of Service</Link>,
                            and our{' '}
                            <Link to="/privacy" className="text-rose-400 hover:text-rose-300 underline underline-offset-2">Privacy Policy</Link>.
                        </p>
                    </section>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default RefundPolicyPage;
