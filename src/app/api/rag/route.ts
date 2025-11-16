import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { vectorService } from '@/lib/vector-service';

// GET - List all RAG contents for a business
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    const contents = await prisma.rAGContent.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(contents);
  } catch (error) {
    console.error('Error fetching RAG contents:', error);
    return NextResponse.json({ error: 'Failed to fetch contents' }, { status: 500 });
  }
}

// POST - Create new RAG content
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { businessId, title, content, category, metadata } = body;

    if (!businessId || !title || !content || !category) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create in database
    const ragContent = await prisma.rAGContent.create({
      data: {
        businessId,
        title,
        content,
        category,
        metadata: metadata || {},
      },
    });

    // Add to vector database
    try {
      const { embedding } = await vectorService.upsertContent(
        ragContent.id,
        content,
        {
          businessId,
          title,
          category,
          ...metadata,
        }
      );

      // Update with vector ID
      await prisma.rAGContent.update({
        where: { id: ragContent.id },
        data: { vectorId: ragContent.id },
      });
    } catch (vectorError) {
      console.error('Error adding to vector database:', vectorError);
      // Continue even if vector insertion fails
    }

    return NextResponse.json(ragContent, { status: 201 });
  } catch (error) {
    console.error('Error creating RAG content:', error);
    return NextResponse.json({ error: 'Failed to create content' }, { status: 500 });
  }
}

// PUT - Update RAG content
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, title, content, category, metadata, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'Content ID required' }, { status: 400 });
    }

    // Update in database
    const ragContent = await prisma.rAGContent.update({
      where: { id },
      data: {
        title,
        content,
        category,
        metadata,
        isActive,
      },
    });

    // Update in vector database if content changed
    if (content) {
      try {
        await vectorService.updateContent(id, content, {
          businessId: ragContent.businessId,
          title: ragContent.title,
          category: ragContent.category,
          ...metadata,
        });
      } catch (vectorError) {
        console.error('Error updating vector database:', vectorError);
      }
    }

    return NextResponse.json(ragContent);
  } catch (error) {
    console.error('Error updating RAG content:', error);
    return NextResponse.json({ error: 'Failed to update content' }, { status: 500 });
  }
}

// DELETE - Delete RAG content
export async function DELETE(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Content ID required' }, { status: 400 });
    }

    // Delete from vector database
    try {
      await vectorService.deleteContent(id);
    } catch (vectorError) {
      console.error('Error deleting from vector database:', vectorError);
    }

    // Delete from database
    await prisma.rAGContent.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting RAG content:', error);
    return NextResponse.json({ error: 'Failed to delete content' }, { status: 500 });
  }
}
