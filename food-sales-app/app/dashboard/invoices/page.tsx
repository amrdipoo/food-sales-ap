// app/dashboard/invoices/page.tsx
import { checkAccess } from '../../actions/authActions';
import { getUserRole } from '../../actions/authActions';
import { getInvoicesList } from '../../actions/invoiceActions';
import InvoicesClientView from './InvoicesClientView';

export const dynamic = 'force-dynamic';

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string; deleted?: string; restored?: string }>;
}) {
  // ✅ الانتظار لاستخراج searchParams (مطلوب في Next.js 16)
  const resolvedSearchParams = await searchParams;

  // التحقق من الصلاحية
  await checkAccess('/dashboard/invoices');

  // جلب دور المستخدم الحالي
  const userRole = await getUserRole();

  // جلب قائمة الفواتير
  const invoices = await getInvoicesList();

  return (
    <InvoicesClientView
      initialInvoices={invoices}
      userRole={userRole}
      messages={{
        updated: resolvedSearchParams.updated === 'true' ? '✅ تم تحديث الفاتورة بنجاح' : null,
        deleted: resolvedSearchParams.deleted === 'true' ? '✅ تم حذف الفاتورة بنجاح' : null,
        restored: resolvedSearchParams.restored === 'true' ? '✅ تم استعادة الفاتورة بنجاح' : null,
      }}
    />
  );
}