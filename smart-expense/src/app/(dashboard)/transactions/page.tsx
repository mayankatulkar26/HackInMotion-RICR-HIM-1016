import { listTransactions } from '@/actions/transactions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TransactionForm } from '@/components/transactions/transaction-form';
import { CsvUploader } from '@/components/transactions/csv-uploader';
import { TransactionTable } from '@/components/transactions/transaction-table';

export default async function TransactionsPage() {
  const rows = await listTransactions({ limit: 500 });
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Data in
        </p>
        <h1 className="text-3xl font-semibold tracking-tight mt-1">Transactions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Add a transaction manually or import a CSV bank statement.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Add transactions</CardTitle>
            <CardDescription>Manual entry or bulk CSV import.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="manual">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="manual">Manual</TabsTrigger>
                <TabsTrigger value="csv">CSV upload</TabsTrigger>
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

        <Card>
          <CardHeader>
            <CardTitle>All transactions</CardTitle>
            <CardDescription>
              {rows.length} loaded · newest first
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TransactionTable rows={rows} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
