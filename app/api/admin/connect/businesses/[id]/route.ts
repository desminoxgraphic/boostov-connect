import { NextResponse } from 'next/server';
import { requireApi } from '@/lib/authz';
import {
  getConnectBusinessById,
  updateConnectBusiness,
  deleteConnectBusiness,
  getConnectCapabilities,
} from '@/lib/connect-db';
import { pickConnectBusinessFields } from '@/lib/connect-utils';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const gate = await requireApi('admin');
  if (!gate.ok) return gate.response;

  try {
    const data = await getConnectBusinessById(params.id);
    if (!data) {
      return NextResponse.json({ error: 'Business profile not found.' }, { status: 404 });
    }
    return NextResponse.json({
      ...data,
      capabilities: await getConnectCapabilities(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const gate = await requireApi('admin');
  if (!gate.ok) return gate.response;

  try {
    const body = await request.json();
    const updated = await updateConnectBusiness(params.id, pickConnectBusinessFields(body));
    if (!updated) {
      return NextResponse.json({ error: 'Business profile not found.' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error('API Error PUT /api/admin/connect/businesses/[id]:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const gate = await requireApi('admin');
  if (!gate.ok) return gate.response;

  try {
    await deleteConnectBusiness(params.id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('API Error DELETE /api/admin/connect/businesses/[id]:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
