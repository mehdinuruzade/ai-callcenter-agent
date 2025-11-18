import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { vectorService } from '@/lib/vector-service-supabase';

interface BulkImportItem {
  title: string;
  category: string;
  content: string;
  metadata?: any;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { businessId, items } = body;

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items must be a non-empty array' },
        { status: 400 }
      );
    }

    // Verify business ownership
    const business = await prisma.business.findFirst({
      where: {
        id: businessId,
        userId: session.user.id,
      },
    });

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found or unauthorized' },
        { status: 404 }
      );
    }

    // Validate all items first
    const validCategories = [
      'FAQ',
      'Product Info',
      'Policy',
      'Pricing',
      'Support',
      'Location',
      'Hours',
      'Services',
      'Booking',
      'Other',
    ];

    const invalidItems: { index: number; reason: string }[] = [];

    items.forEach((item: any, index: number) => {
      if (!item.title || typeof item.title !== 'string') {
        invalidItems.push({ index: index + 1, reason: 'Missing or invalid title' });
      }
      if (!item.content || typeof item.content !== 'string') {
        invalidItems.push({ index: index + 1, reason: 'Missing or invalid content' });
      }
      if (!item.category || !validCategories.includes(item.category)) {
        invalidItems.push({ 
          index: index + 1, 
          reason: `Invalid category. Must be one of: ${validCategories.join(', ')}` 
        });
      }
    });

    if (invalidItems.length > 0) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          invalidItems,
          message: `${invalidItems.length} item(s) failed validation` 
        },
        { status: 400 }
      );
    }

    // Import items
    let imported = 0;
    let failed = 0;
    const errors: { index: number; error: string }[] = [];

    for (let i = 0; i < items.length; i++) {
      try {
        const item: BulkImportItem = items[i];
        
        await vectorService.storeContent({
          title: item.title.trim(),
          content: item.content.trim(),
          category: item.category,
          businessId,
          metadata: item.metadata || {},
        });

        imported++;
        console.log(`✅ Imported item ${i + 1}/${items.length}: ${item.title}`);
      } catch (error: any) {
        failed++;
        errors.push({ 
          index: i + 1, 
          error: error.message || 'Unknown error' 
        });
        console.error(`❌ Failed to import item ${i + 1}:`, error);
      }
    }

    return NextResponse.json({
      message: 'Bulk import completed',
      total: items.length,
      imported,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('Error in bulk import:', error);
    return NextResponse.json(
      { error: 'Failed to process bulk import' },
      { status: 500 }
    );
  }
}