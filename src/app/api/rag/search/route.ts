import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { vectorService } from '@/lib/vector-service-supabase';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query, businessId, limit } = await req.json();

    if (!query || !businessId) {
      return NextResponse.json(
        { error: 'Query and businessId required' },
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
        { error: 'Business not found or access denied' },
        { status: 404 }
      );
    }

    // Search only within this business's content
    const results = await vectorService.searchSimilar(
      query,
      businessId,
      limit || 5
    );

    console.log(`🔍 Search for "${query}" in business "${business.name}": ${results.length} results`);

    return NextResponse.json({ 
      results,
      business: {
        id: business.id,
        name: business.name,
      },
      query,
    });
  } catch (error) {
    console.error('Error searching:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}
