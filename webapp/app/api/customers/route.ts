import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { z } from "zod";

const CreateCustomerSchema = z.object({
  company_name: z.string().min(1),
  contact_name: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  sector: z
    .enum(["renewable_energy", "logistics", "infrastructure"])
    .optional(),
  account_status: z
    .enum(["active", "suspended", "closed"])
    .default("active"),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const sector = searchParams.get("sector");
  const account_status = searchParams.get("account_status");
  const from = (page - 1) * limit;

  const supabase = getServiceClient();
  let query = supabase
    .from("customers")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1);

  if (sector && sector !== "all") query = query.eq("sector", sector);
  if (account_status && account_status !== "all")
    query = query.eq("account_status", account_status);

  const { data, count, error } = await query;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ customers: data, total: count, page, limit });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const payload = CreateCustomerSchema.parse(body);

    const supabase = getServiceClient();

    // Insert customer
    const { data: customer, error } = await supabase
      .from("customers")
      .insert([{
        company_name: payload.company_name,
        contact_name: payload.contact_name || null,
        email: payload.email || null,
        phone: payload.phone || null,
        sector: payload.sector || null,
        account_status: payload.account_status,
        total_claims: 0,
        approved_claims: 0,
      }] as any[])
      .select()
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    // Audit log (fire-and-forget)
    supabase.from("audit_log").insert([{
      claim_id: null,
      event_type: "submitted",
      actor: "CRM-UI",
      payload: { company_name: payload.company_name, sector: payload.sector },
    }] as any[]).then(() => {}).catch(console.error);

    return NextResponse.json({ customer }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: err.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id)
      return NextResponse.json(
        { error: "Missing customer id" },
        { status: 400 }
      );

    const body = await req.json();
    const { account_status } = z
      .object({ account_status: z.enum(["active", "suspended", "closed"]) })
      .parse(body);

    const supabase = getServiceClient();

    const { data: customer, error } = await supabase
      .from("customers")
      .update({ account_status, updated_at: new Date().toISOString() } as any)
      .eq("id", id)
      .select()
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    // Audit log (fire-and-forget)
    supabase.from("audit_log").insert([{
      claim_id: null,
      event_type: "overridden",
      actor: "CRM-UI",
      payload: { customer_id: id, new_status: account_status },
    }] as any[]).then(() => {}).catch(console.error);

    return NextResponse.json({ customer });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: err.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
