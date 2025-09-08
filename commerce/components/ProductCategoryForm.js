import { useState } from 'react';
import { Card, FormLayout, TextField, Button, BlockStack, InlineStack, Badge, Text } from '@shopify/polaris';

export function ProductCategoryForm({ category, onSave }) {
  const [commission, setCommission] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!commission || isNaN(commission)) return;
    
    setLoading(true);
    try {
      await onSave(category.name, parseFloat(commission), true, 'category');
    } finally {
      setLoading(false);
      setCommission('');
    }
  };

  return (
    <Card>
      <div style={{ padding: '16px' }}>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <BlockStack gap="200">
              <Text variant="headingMd" as="h3">{category.name}</Text>
              <Text as="p" tone="subdued">{category.productCount} products</Text>
            </BlockStack>
            <Badge tone="info">
              Category
            </Badge>
          </InlineStack>
          
          <FormLayout>
            <TextField
              label="Category Commission (%)"
              type="number"
              value={commission}
              onChange={setCommission}
              placeholder="e.g., 12.0"
              helpText="This will apply the commission to all products in this category"
            />
            
            <InlineStack gap="200">
              <Button
                variant="primary"
                onClick={handleSave}
                loading={loading}
                disabled={!commission || isNaN(commission)}
              >
                Apply to {category.productCount} Products
              </Button>
            </InlineStack>

            {commission && !isNaN(commission) && (
              <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#f6f6f7', borderRadius: '8px' }}>
                <Text variant="headingXs" as="h4">Bulk Action Preview</Text>
                <Text as="p" tone="subdued">
                  This will set {commission}% commission on all {category.productCount} products in the "{category.name}" category.
                </Text>
                <Text as="p" tone="warning">
                  ⚠️ This will override any existing commissions on these products.
                </Text>
              </div>
            )}
          </FormLayout>
        </BlockStack>
      </div>
    </Card>
  );
}