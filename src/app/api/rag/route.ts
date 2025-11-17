import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { vectorService } from '@/lib/vector-service-supabase';

// GET - List all RAG contents
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get('businessId');

    const where: any = {};
    
    // Filter by user's businesses
    const businesses = await prisma.business.findMany({
      where: { userId: session.user.id },
      select: { id: true },
    });
    
    const businessIds = businesses.map((b: { id: string }) => b.id);
    where.businessId = { in: businessIds };

    if (businessId) {
      where.businessId = businessId;
    }

    const contents = await prisma.rAGContent.findMany({
      where,
      include: {
        business: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(contents);
  } catch (error) {
    console.error('Error fetching RAG contents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contents' },
      { status: 500 }
    );
  }
}

// POST - Create new RAG content with embedding
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, content, category, businessId, metadata } = body;

    if (!title || !content || !category || !businessId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Store with embedding
    await vectorService.storeContent({
      title,
      content,
      category,
      businessId,
      metadata,
    });

    return NextResponse.json(
      { message: 'Content created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating RAG content:', error);
    return NextResponse.json(
      { error: 'Failed to create content' },
      { status: 500 }
    );
  }
}

// DELETE - Delete RAG content
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Content ID required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const content = await prisma.rAGContent.findUnique({
      where: { id },
      include: { business: true },
    });

    if (!content || content.business.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }

    await prisma.rAGContent.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Content deleted' });
  } catch (error) {
    console.error('Error deleting RAG content:', error);
    return NextResponse.json(
      { error: 'Failed to delete content' },
      { status: 500 }
    );
  }
}
