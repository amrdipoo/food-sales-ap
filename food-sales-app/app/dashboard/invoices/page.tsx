// app/dashboard/invoices/page.tsx
import { checkAccess } from '../../actions/authActions';
import { getUserRole } from '../../actions/authActions';
import { getInvoicesList } from '../../actions/invoiceActions';
import InvoicesClientView from './InvoicesClientView';
export const dynamic = 'force-dynamic';
export default async function InvoicesPage({
  searchParams,
}: {
  searchParams?: { updated?: string; deleted?: string; restored?: string };
}) {
  await checkAccess('/dashboard/invoices');
  const userRole = await getUserRole();
  const invoices = await getInvoicesList();

  return (
    <InvoicesClientView
      initialInvoices={invoices}
      userRole={userRole}
      messages={{
        updated: searchParams?.updated === 'true' ? '✅ تم تحديث الفاتورة بنجاح' : null,
        deleted: searchParams?.deleted === 'true' ? '✅ تم حذف الفاتورة بنجاح' : null,
        restored: searchParams?.restored === 'true' ? '✅ تم استعادة الفاتورة بنجاح' : null,
      }}
    />
  );
}