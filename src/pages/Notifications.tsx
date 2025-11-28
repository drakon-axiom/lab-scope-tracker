import Layout from "@/components/Layout";
import { EmailTemplatesManager } from "@/components/EmailTemplatesManager";

const Notifications = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground mt-2">
            Manage email templates for vendor communications
          </p>
        </div>
        
        <EmailTemplatesManager />
      </div>
    </Layout>
  );
};

export default Notifications;
