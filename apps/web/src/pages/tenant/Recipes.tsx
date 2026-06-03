import * as React from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Sparkles, Printer, Tag, ArrowLeft, ChefHat } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, EmptyState, Spinner } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { listRecipes, upsertRecipe, deleteRecipe, getRecipe } from '@/lib/store';
import { callAI } from '@/lib/ai';
import { computeCogs, formatCents } from '@culina/shared';
import type { Recipe, RecipeIngredient } from '@culina/shared';
import { genId } from '@/lib/utils';

export default function Recipes() {
  const { profile } = useAuth();
  const [, force] = React.useReducer((x) => x + 1, 0);
  const recipes = listRecipes(profile!.id);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  if (editingId) {
    return <RecipeEditor id={editingId} onBack={() => { setEditingId(null); force(); }} />;
  }

  function newRecipe() {
    const r = upsertRecipe({ tenant_id: profile!.id, name: 'Untitled recipe', ingredients: [], yield_quantity: 12, yield_unit: 'units' });
    setEditingId(r.id);
  }

  return (
    <div>
      <PageHeader title="Recipe & Food Cost Lab" description="Know your true cost per unit and price for profit." action={<Button onClick={newRecipe}><Plus className="h-4 w-4" /> New recipe</Button>} />
      {recipes.length === 0 ? (
        <EmptyState icon={ChefHat} title="No recipes yet" description="Add a recipe to calculate COGS and suggested pricing." action={<Button onClick={newRecipe}>Create recipe</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((r) => (
            <button key={r.id} onClick={() => setEditingId(r.id)} className="rounded-lg border bg-card p-5 text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-semibold">{r.name}</h3>
                {r.is_published && <Badge variant="success">Published</Badge>}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Yields {r.yield_quantity} {r.yield_unit}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Mini label="COGS/unit" value={formatCents(r.cogs_cents)} />
                <Mini label="Price" value={formatCents(r.selling_price_cents)} />
                <Mini label="Margin" value={`${r.gross_margin_percent ?? 0}%`} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/50 p-2">
      <div className="font-heading text-sm font-bold">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function RecipeEditor({ id, onBack }: { id: string; onBack: () => void }) {
  const existing = getRecipe(id)!;
  const [r, setR] = React.useState<Recipe>({ ...existing, ingredients: [...existing.ingredients] });
  const [batches, setBatches] = React.useState(1);
  const [advice, setAdvice] = React.useState('');
  const [loadingAdvice, setLoadingAdvice] = React.useState(false);
  const [label, setLabel] = React.useState('');

  const cogs = computeCogs({
    ingredients: r.ingredients,
    laborMinutes: r.labor_minutes ?? 0,
    laborHourlyRateCents: r.labor_hourly_rate_cents ?? 0,
    overheadPercent: r.overhead_percent,
    targetMarginPercent: r.target_margin_percent,
    yieldQuantity: r.yield_quantity ?? 1,
  });

  function update(patch: Partial<Recipe>) {
    setR((prev) => ({ ...prev, ...patch }));
  }
  function setIngredient(i: number, patch: Partial<RecipeIngredient>) {
    const next = [...r.ingredients];
    const ing = { ...next[i], ...patch };
    ing.total_cost = Math.round(ing.quantity * ing.cost_per_unit * 100) / 100;
    next[i] = ing;
    update({ ingredients: next });
  }
  function addIngredient() {
    update({ ingredients: [...r.ingredients, { name: '', quantity: 1, unit: 'lb', cost_per_unit: 0, total_cost: 0 }] });
  }
  function removeIngredient(i: number) {
    update({ ingredients: r.ingredients.filter((_, idx) => idx !== i) });
  }

  function save() {
    upsertRecipe(r);
    toast.success('Recipe saved');
  }
  function remove() {
    deleteRecipe(id);
    toast.success('Recipe deleted');
    onBack();
  }

  async function getAdvice() {
    setLoadingAdvice(true);
    const fallback = [
      `Your largest cost driver is "${[...r.ingredients].sort((a, b) => b.total_cost - a.total_cost)[0]?.name ?? 'ingredients'}". A few ideas:`,
      `• Buy that item in bulk or via a restaurant-supply account to cut 10–20% off unit cost.`,
      `• Your current COGS is ${formatCents(cogs.cogsPerUnitCents)}/unit at a ${cogs.grossMarginPercent}% margin. Nudging price to ${formatCents(cogs.suggestedPriceCents)} hits your ${r.target_margin_percent}% target.`,
      `• Batch larger runs to spread labor: doubling the batch typically lowers per-unit labor cost meaningfully.`,
      `• Consider a small spec change (e.g. a less expensive but comparable flour) to protect margin without hurting quality.`,
    ].join('\n');
    const text = await callAI('recipe-advice', { ingredients: r.ingredients, cogs: cogs.cogsPerUnitCents, target_margin: r.target_margin_percent }, fallback);
    setAdvice(text);
    setLoadingAdvice(false);
  }

  function generateLabel() {
    const allergens = Array.from(new Set(r.ingredients.flatMap((i) => detectAllergens(i.name))));
    setLabel(
      [
        `${r.name.toUpperCase()}`,
        `Net Wt. (per unit) — fill in`,
        `Servings per container: ${r.yield_quantity ?? 1}`,
        ``,
        `INGREDIENTS: ${r.ingredients.map((i) => i.name).filter(Boolean).join(', ')}.`,
        allergens.length ? `CONTAINS: ${allergens.join(', ')}.` : `CONTAINS: (review for allergens)`,
        ``,
        `Made in a shared commercial kitchen that also processes common allergens.`,
      ].join('\n'),
    );
  }

  return (
    <div>
      <button onClick={onBack} className="mb-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"><ArrowLeft className="h-4 w-4" /> All recipes</button>
      <PageHeader
        title={r.name || 'Untitled recipe'}
        action={
          <>
            <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print card</Button>
            <Button variant="destructive" onClick={remove}><Trash2 className="h-4 w-4" /></Button>
            <Button onClick={save}>Save</Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Name</Label><Input value={r.name} onChange={(e) => update({ name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Yield qty</Label><Input type="number" value={r.yield_quantity ?? 0} onChange={(e) => update({ yield_quantity: Number(e.target.value) })} /></div>
                <div><Label>Yield unit</Label><Input value={r.yield_unit ?? ''} onChange={(e) => update({ yield_unit: e.target.value })} /></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Ingredients</CardTitle>
              <Button size="sm" variant="outline" onClick={addIngredient}><Plus className="h-4 w-4" /> Add</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="hidden grid-cols-12 gap-2 px-1 text-xs font-medium text-muted-foreground sm:grid">
                  <div className="col-span-4">Ingredient</div><div className="col-span-2">Qty</div><div className="col-span-2">Unit</div><div className="col-span-2">$/unit</div><div className="col-span-2 text-right">Total</div>
                </div>
                {r.ingredients.map((ing, i) => (
                  <div key={i} className="grid grid-cols-12 items-center gap-2">
                    <Input className="col-span-12 sm:col-span-4" placeholder="Flour" value={ing.name} onChange={(e) => setIngredient(i, { name: e.target.value })} />
                    <Input className="col-span-3 sm:col-span-2" type="number" value={ing.quantity} onChange={(e) => setIngredient(i, { quantity: Number(e.target.value) })} />
                    <Input className="col-span-3 sm:col-span-2" value={ing.unit} onChange={(e) => setIngredient(i, { unit: e.target.value })} />
                    <Input className="col-span-4 sm:col-span-2" type="number" step="0.01" value={ing.cost_per_unit} onChange={(e) => setIngredient(i, { cost_per_unit: Number(e.target.value) })} />
                    <div className="col-span-1 text-right text-sm font-medium sm:col-span-2">{formatCents(ing.total_cost * 100)}</div>
                    <button onClick={() => removeIngredient(i)} className="col-span-1 justify-self-end text-red-400 hover:text-red-600 sm:hidden"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
                {r.ingredients.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Add ingredients to calculate cost.</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Labor & overhead</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div><Label>Labor (min)</Label><Input type="number" value={r.labor_minutes ?? 0} onChange={(e) => update({ labor_minutes: Number(e.target.value) })} /></div>
              <div><Label>Rate ($/hr)</Label><Input type="number" value={(r.labor_hourly_rate_cents ?? 0) / 100} onChange={(e) => update({ labor_hourly_rate_cents: Math.round(Number(e.target.value) * 100) })} /></div>
              <div><Label>Overhead %</Label><Input type="number" value={r.overhead_percent} onChange={(e) => update({ overhead_percent: Number(e.target.value) })} /></div>
              <div><Label>Target margin %</Label><Input type="number" value={r.target_margin_percent} onChange={(e) => update({ target_margin_percent: Number(e.target.value) })} /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between"><CardTitle>FDA label & allergens</CardTitle><Button size="sm" variant="outline" onClick={generateLabel}><Tag className="h-4 w-4" /> Generate</Button></CardHeader>
            <CardContent>
              {label ? <pre className="whitespace-pre-wrap rounded-lg border bg-muted/40 p-4 font-mono text-xs">{label}</pre> : <p className="text-sm text-muted-foreground">Generate a starter ingredient + allergen statement from your recipe.</p>}
            </CardContent>
          </Card>
        </div>

        {/* Cost panel */}
        <div className="space-y-6">
          <Card className="sticky top-24">
            <CardHeader><CardTitle>Cost & pricing</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Ingredient cost" value={formatCents(cogs.ingredientCostCents)} />
              <Row label="Labor cost" value={formatCents(cogs.laborCostCents)} />
              <Row label={`Overhead (${r.overhead_percent}%)`} value={formatCents(cogs.overheadCents)} />
              <div className="flex justify-between border-t pt-2 font-semibold"><span>Total batch COGS</span><span>{formatCents(cogs.cogsCents)}</span></div>
              <div className="mt-3 rounded-lg bg-primary/5 p-3">
                <Row label="COGS / unit" value={formatCents(cogs.cogsPerUnitCents)} />
                <Row label={`Suggested price (${r.target_margin_percent}% margin)`} value={formatCents(cogs.suggestedPriceCents)} bold />
                <Row label="Gross margin" value={`${cogs.grossMarginPercent}%`} />
              </div>
              <div className="mt-3">
                <Label>Batch scaling</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Input type="number" min={1} value={batches} onChange={(e) => setBatches(Math.max(1, Number(e.target.value)))} className="w-20" />
                  <span className="text-sm text-muted-foreground">batches → {formatCents(cogs.cogsCents * batches)} cost, {(r.yield_quantity ?? 0) * batches} units</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent" /> AI cost advisor</CardTitle></CardHeader>
            <CardContent>
              <Button variant="accent" className="w-full" onClick={getAdvice} disabled={loadingAdvice}>
                {loadingAdvice ? <Spinner className="h-4 w-4 border-white/40 border-t-white" /> : 'Suggest ways to reduce COGS'}
              </Button>
              {advice && <pre className="mt-3 whitespace-pre-wrap rounded-lg border bg-muted/40 p-3 text-xs leading-relaxed">{advice}</pre>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? 'font-bold text-primary' : 'font-medium'}>{value}</span>
    </div>
  );
}

function detectAllergens(name: string): string[] {
  const n = name.toLowerCase();
  const out: string[] = [];
  if (/(flour|wheat|bread|bagel|dough|gluten)/.test(n)) out.push('wheat');
  if (/(butter|milk|cream|cheese|yogurt)/.test(n)) out.push('milk');
  if (/(egg)/.test(n)) out.push('eggs');
  if (/(peanut)/.test(n)) out.push('peanuts');
  if (/(almond|walnut|pecan|cashew|nut)/.test(n)) out.push('tree nuts');
  if (/(soy)/.test(n)) out.push('soy');
  if (/(sesame)/.test(n)) out.push('sesame');
  return out;
}
