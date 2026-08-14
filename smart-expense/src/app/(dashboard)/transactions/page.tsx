import { listBatches, listTransactions } from '@/actions/transactions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TransactionForm } from '@/components/transactions/transaction-form';
import { CsvUploader } from '@/components/transactions/csv-uploader';
import { StatementsView } from '@/components/transactions/statements-view';

export default async function TransactionsPage() {
  const [all, { batches, manualCount }] = await Promise.all([
    listTransactions({ limit: 1000 }),
    listBatches(),
  ]);

  return (
    <div className="space-y-6 px-0">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Data in
        </p>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mt-1">Transactions</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Every upload becomes its own statement. Use the tabs to view them separately or the combined feed.
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Add transactions</CardTitle>
            <CardDescription>Manual entry or bulk import.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="manual">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="manual">Manual</TabsTrigger>
                <TabsTrigger value="csv">CSV / Excel / PDF</TabsTrigger>
              </TabsList>
              <TabsContent value="manual">
                <TransactionForm />
              </TabsContent>
              <TabsContent value="csv">
                <CsvUploader />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <StatementsView
          batches={batches}
          manualCount={manualCount}
          all={all}
        />
      </div>
    </div>
  );
}
