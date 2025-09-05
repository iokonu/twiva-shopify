import { useState } from 'react';
import { Card, FormLayout, TextField, Button, BlockStack, InlineStack, Badge, Text, Thumbnail } from '@shopify/polaris';

export function CategoryCommissionForm({ category, onSave, onRemove }) {
  const [commission, setCommission] = useState(
    category.commission?.commission?.toString() || ''
  );
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!commission || isNaN(commission)) return;
    
    setLoading(true);
    try {
      await onSave(category.id, parseFloat(commission), true);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!category.commission) return;
    
    setLoading(true);
    try {
      await onRemove('collection', category.commission.id);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <div style={{ padding: '16px' }}>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="start">
            <InlineStack gap="300" blockAlign="start">
              {category.image && (
                <Thumbnail
                  source={category.image.url}
                  alt={category.image.altText || category.title}
                  size="small"
                />
              )}
              <BlockStack gap="200">
                <Text variant="headingMd" as="h3">{category.title}</Text>
                <Text as="p" tone="subdued">{category.productsCount} products</Text>
                {category.description && (
                  <Text as="p" tone="subdued" truncate>
                    {category.description.substring(0, 100)}{category.description.length > 100 ? '...' : ''}
                  </Text>
                )}
              </BlockStack>
            </InlineStack>
            {category.commission && (
              <Badge tone="success">
                {category.commission.commission}% Commission
              </Badge>
            )}
          </InlineStack>
          
          <FormLayout>
            <TextField
              label="Collection Commission (%)"
              type="number"
              value={commission}
              onChange={setCommission}
              placeholder="e.g., 15.0"
              helpText="This commission will apply to all products in this collection"
            />
            
            <InlineStack gap="200">
              <Button
                variant="primary"
                onClick={handleSave}
                loading={loading}
                disabled={!commission || isNaN(commission)}
              >
                Apply to Collection + {category.productsCount} Products
              </Button>
              
              {category.commission && (
                <Button
                  tone="critical"
                  onClick={handleRemove}
                  loading={loading}
                >
                  Remove Commission
                </Button>
              )}
            </InlineStack>

            {commission && !isNaN(commission) && category.productsCount > 0 && (
              <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#f6f6f7', borderRadius: '8px' }}>
                <Text variant="headingXs" as="h4">Bulk Action Preview</Text>
                <Text as="p" tone="subdued">
                  This will apply {commission}% commission to all {category.productsCount} products in this collection.
                </Text>
                <Text as="p" tone="warning">
                  ⚠️ This will override any existing product-specific commissions in this collection.
                </Text>
              </div>
            )}
          </FormLayout>
        </BlockStack>
      </div>
    </Card>
  );
}