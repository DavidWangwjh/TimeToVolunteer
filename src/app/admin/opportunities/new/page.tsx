import { PageHeader } from "@/components/layout/PageHeader";
import { CreateOpportunityForm } from "@/components/opportunities/CreateOpportunityForm";

export default function NewOpportunityPage() {
  return (
    <div>
      <PageHeader
        title="Create Opportunity"
        description="Add a new volunteer session."
      />
      <CreateOpportunityForm />
    </div>
  );
}
