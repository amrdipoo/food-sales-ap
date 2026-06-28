// app/dashboard/collections/page.tsx
import { checkAccess } from '../../actions/authActions';
import { getActiveCustomers, getCollectionsList, getPendingInvoices } from '../../actions/collectionActions';
import { getCurrentUserAction } from '../../actions/userActions';
import CollectionsClient from './CollectionsClient';

export const dynamic = 'force-dynamic';

export default async function CollectionsPage() {
  await checkAccess('/dashboard/collections');

  // ✅ جلب البيانات مع معالجة الأخطاء وضمان القيم الافتراضية
  const [customers, currentUser, collections, pendingInvoices] = await Promise.all([
    getActiveCustomers().catch(() => []),
    getCurrentUserAction().catch(() => null),
    getCollectionsList().catch(() => []),
    getPendingInvoices().catch(() => []),
  ]);

  // ✅ تأكد من أن `customers` هي مصفوفة حتى لو كانت null أو undefined
  const safeCustomers = Array.isArray(customers) ? customers : [];
  const safeCollections = Array.isArray(collections) ? collections : [];
  const safePendingInvoices = Array.isArray(pendingInvoices) ? pendingInvoices : [];

  return (
    <CollectionsClient
      customers={safeCustomers}
      currentUser={currentUser || null}
      collections={safeCollections}
      pendingInvoices={safePendingInvoices}
    />
  );
}