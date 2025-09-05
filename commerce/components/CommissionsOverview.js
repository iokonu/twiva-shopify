import { Card, DataTable, Text, Badge, InlineStack, Grid, Button } from '@shopify/polaris';

export function CommissionsOverview({ stats, commissions, onRefresh, showTable = false }) {
  const formatCurrency = (amount, currencyCode = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(amount);
  };

  const StatCard = ({ title, value, subtitle, tone = 'default' }) => (
    <Card>
      <div style={{ padding: '16px', textAlign: 'center' }}>
        <Text variant="headingXs" as="h4" tone="subdued">{title}</Text>
        <Text variant="headingLg" as="h2" tone={tone}>{value}</Text>
        {subtitle && (
          <Text as="p" tone="subdued">{subtitle}</Text>
        )}
      </div>
    </Card>
  );

  const commissionRows = showTable && commissions ? commissions.map((commission) => [
    commission.type === 'product' ? commission.productTitle : commission.collectionTitle,
    <Badge tone={commission.type === 'product' ? 'info' : 'success'}>
      {commission.type === 'product' ? 'Product' : 'Category'}
    </Badge>,
    `${commission.commission}%`,
    commission.type === 'product' 
      ? formatCurrency(commission.productPrice || 0, commission.currencyCode)
      : `${commission.productsCount || 0} products`,
    commission.type === 'product' && commission.productPrice
      ? formatCurrency((commission.productPrice * commission.commission) / 100, commission.currencyCode)
      : 'N/A',
    commission.createdAt ? new Date(commission.createdAt).toLocaleDateString() : 'N/A',
  ]) : [];

  return (
    <div>
      {/* Stats Overview*/}
      {!showTable && (
        <Card>
          <div style={{ padding: '16px' }}>
            <InlineStack align="space-between" blockAlign="center">
              <Text variant="headingMd" as="h3">
                Commission Overview
              </Text>
              <Button onClick={onRefresh}>Refresh</Button>
            </InlineStack>
            
            <div style={{ marginTop: '16px' }}>
              <Grid>
                <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 3, xl: 3}}>
                  <StatCard
                    title="Total Commissions"
                    value={stats.totalCommissions || 0}
                    subtitle="Active commission rules"
                  />
                </Grid.Cell>
                <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 3, xl: 3}}>
                  <StatCard
                    title="Products Without Commissions"
                    value={stats.productsWithoutCommissions || 0}
                    subtitle="Products needing commission setup"
                    tone="info"
                  />
                </Grid.Cell>
                <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 3, xl: 3}}>
                  <StatCard
                    title="Collection Commissions"
                    value={stats.collectionCommissions || 0}
                    subtitle="Collection-wide rules"
                    tone="success"
                  />
                </Grid.Cell>
                <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 3, xl: 3}}>
                  <StatCard
                    title="Commission Payouts"
                    value={formatCurrency(stats.totalPotentialEarnings || 0)}
                    subtitle="Based on current prices"
                    tone="warning"
                  />
                </Grid.Cell>
              </Grid>
            </div>

            {stats.averageCommission && (
              <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#f6f6f7', borderRadius: '8px' }}>
                <InlineStack gap="400" align="space-between">
                  <Text variant="headingXs" as="h4">Average Commission Rate</Text>
                  <Text fontWeight="semibold">{stats.averageCommission.toFixed(2)}%</Text>
                </InlineStack>
                {stats.highestCommission && (
                  <InlineStack gap="400" align="space-between">
                    <Text>Highest Commission</Text>
                    <Text>{stats.highestCommission.commission}% ({stats.highestCommission.type})</Text>
                  </InlineStack>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {showTable && stats.averageCommission && (
        <Card sectioned>
          <InlineStack gap="400" align="space-between">
            <Text variant="headingXs" as="h4">Average Commission Rate</Text>
            <Text fontWeight="semibold">{stats.averageCommission.toFixed(2)}%</Text>
          </InlineStack>
          {stats.highestCommission && (
            <InlineStack gap="400" align="space-between">
              <Text>Highest Commission</Text>
              <Text>{stats.highestCommission.commission}% ({stats.highestCommission.type})</Text>
            </InlineStack>
          )}
        </Card>
      )}

      {/* Commission Table */}
      {showTable && commissions && commissions.length > 0 && (
        <Card sectioned>
          <Text variant="headingMd" as="h3" style={{ marginBottom: '16px' }}>
            All Commissions
          </Text>
          <DataTable
            columnContentTypes={[
              'text',
              'text', 
              'text',
              'text',
              'text',
              'text',
            ]}
            headings={[
              'Item',
              'Type',
              'Commission',
              'Price/Count',
              'Commission Amount',
              'Date Added',
            ]}
            rows={commissionRows}
            hoverable
          />
        </Card>
      )}

      {showTable && (!commissions || commissions.length === 0) && (
        <Card>
          <div style={{ textAlign: 'center', padding: '32px' }}>
            <Text as="p" tone="subdued">
              No commissions set yet. Go to Products or Categories tabs to set up commissions.
            </Text>
          </div>
        </Card>
      )}
    </div>
  );
}