import EmailCampaignForm from '../../../components/admin/email/EmailCampaignForm';

export default function AdminEmailCampaignsPage() {
  return (
    <main className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-serif mb-4">Email Campaigns</h1>
      <p className="mb-6 text-sm text-gray-600">Draft and send broadcasts to users.</p>
      <EmailCampaignForm />
    </main>
  );
}
