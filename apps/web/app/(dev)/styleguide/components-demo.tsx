/*
 * Styleguide — components showcase.
 *
 * Server Component: every shadcn primitive from `@modulo/ui` carries its own
 * internal `"use client"` boundary and renders fine here in **uncontrolled**
 * mode (`defaultValue` / `defaultChecked` / Radix triggers). No page-level
 * state is needed, so this stays a Server Component.
 *
 * `sonner` (Toaster) needs an `onClick` handler to fire a toast, so it is
 * listed as "installed, demo to come" rather than wired here.
 */
import { ArrowRight, Check, Plus, Settings, Trash2, User } from "lucide-react"

import { Avatar, AvatarFallback } from "@modulo/ui/components/avatar"
import { Badge } from "@modulo/ui/components/badge"
import { Button } from "@modulo/ui/components/button"
import { SubmitButton } from "@modulo/ui/components/submit-button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@modulo/ui/components/card"
import { Checkbox } from "@modulo/ui/components/checkbox"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@modulo/ui/components/command"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@modulo/ui/components/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@modulo/ui/components/dropdown-menu"
import { Input } from "@modulo/ui/components/input"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@modulo/ui/components/popover"
import { RadioGroup, RadioGroupItem } from "@modulo/ui/components/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@modulo/ui/components/select"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@modulo/ui/components/sheet"
import { Switch } from "@modulo/ui/components/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@modulo/ui/components/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@modulo/ui/components/tabs"
import { Textarea } from "@modulo/ui/components/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@modulo/ui/components/tooltip"

function Demo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="font-mono text-2xs tracking-wide text-text-tertiary">
        {label}
      </p>
      <div className="flex flex-wrap items-start gap-3">{children}</div>
    </div>
  );
}

export function ComponentsDemo() {
  return (
    <div className="flex flex-col gap-10">
      <Demo label="Button">
        <Button>Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="link">Link</Button>
        <Button size="sm">
          <Plus strokeWidth={1.5} />
          New
        </Button>
        <Button variant="outline" size="icon" aria-label="Settings">
          <Settings strokeWidth={1.5} />
        </Button>
      </Demo>

      <Demo label="Badge">
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge variant="destructive">Destructive</Badge>
        <Badge variant="ghost">Ghost</Badge>
        <Badge>
          <Check strokeWidth={1.5} />
          Active
        </Badge>
      </Demo>

      <Demo label="Input · Textarea">
        <div className="flex w-full max-w-sm flex-col gap-3">
          <Input placeholder="Nom de l'organisation" />
          <Input type="email" placeholder="email@exemple.com" />
          <Input placeholder="Champ désactivé" disabled />
          <Textarea placeholder="Description courte du module…" rows={3} />
        </div>
      </Demo>

      <Demo label="Switch · Checkbox · RadioGroup">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Switch defaultChecked id="sg-switch" />
            <label
              htmlFor="sg-switch"
              className="text-sm text-text-secondary"
            >
              Notifications activées
            </label>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox defaultChecked id="sg-check" />
            <label
              htmlFor="sg-check"
              className="text-sm text-text-secondary"
            >
              Accepter les conditions
            </label>
          </div>
          <RadioGroup defaultValue="monthly">
            <div className="flex items-center gap-3">
              <RadioGroupItem value="monthly" id="sg-r1" />
              <label htmlFor="sg-r1" className="text-sm text-text-secondary">
                Facturation mensuelle
              </label>
            </div>
            <div className="flex items-center gap-3">
              <RadioGroupItem value="yearly" id="sg-r2" />
              <label htmlFor="sg-r2" className="text-sm text-text-secondary">
                Facturation annuelle
              </label>
            </div>
          </RadioGroup>
        </div>
      </Demo>

      <Demo label="Select">
        <Select defaultValue="sales">
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Choisir un module" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sales">Sales Analytics</SelectItem>
            <SelectItem value="notes">Notes &amp; Docs</SelectItem>
            <SelectItem value="crm">CRM léger</SelectItem>
          </SelectContent>
        </Select>
      </Demo>

      <Demo label="Card">
        <Card className="w-80">
          <CardHeader>
            <CardTitle>Sales Analytics</CardTitle>
            <CardDescription>
              Pipeline, deals et performance commerciale.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-secondary">
              Module actif depuis 14 jours. 23 deals suivis ce mois-ci.
            </p>
          </CardContent>
          <CardFooter className="gap-2">
            <Button size="sm">
              Ouvrir
              <ArrowRight strokeWidth={1.5} />
            </Button>
            <Button size="sm" variant="ghost">
              Paramètres
            </Button>
          </CardFooter>
        </Card>
      </Demo>

      <Demo label="Tabs">
        <Tabs defaultValue="overview" className="w-96">
          <TabsList>
            <TabsTrigger value="overview">Vue d&apos;ensemble</TabsTrigger>
            <TabsTrigger value="deals">Deals</TabsTrigger>
            <TabsTrigger value="settings">Paramètres</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <p className="pt-3 text-sm text-text-secondary">
              KPI clés et évolution du chiffre d&apos;affaires.
            </p>
          </TabsContent>
          <TabsContent value="deals">
            <p className="pt-3 text-sm text-text-secondary">
              Pipeline kanban des opportunités.
            </p>
          </TabsContent>
          <TabsContent value="settings">
            <p className="pt-3 text-sm text-text-secondary">
              Étapes du pipeline et préférences du module.
            </p>
          </TabsContent>
        </Tabs>
      </Demo>

      <Demo label="Table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Deal</TableHead>
              <TableHead>Étape</TableHead>
              <TableHead className="text-right">Montant</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="text-text-primary">Refonte ERP</TableCell>
              <TableCell>
                <Badge variant="secondary">Négociation</Badge>
              </TableCell>
              <TableCell className="text-right font-mono">12 400 €</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="text-text-primary">Audit sécurité</TableCell>
              <TableCell>
                <Badge>Gagné</Badge>
              </TableCell>
              <TableCell className="text-right font-mono">8 900 €</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="text-text-primary">Migration cloud</TableCell>
              <TableCell>
                <Badge variant="outline">Qualification</Badge>
              </TableCell>
              <TableCell className="text-right font-mono">21 000 €</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Demo>

      <Demo label="Avatar">
        <Avatar>
          <AvatarFallback>CK</AvatarFallback>
        </Avatar>
        <Avatar size="sm">
          <AvatarFallback>ML</AvatarFallback>
        </Avatar>
        <Avatar size="lg">
          <AvatarFallback>
            <User strokeWidth={1.5} />
          </AvatarFallback>
        </Avatar>
      </Demo>

      <Demo label="Tooltip">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline">Survoler</Button>
            </TooltipTrigger>
            <TooltipContent>Astuce contextuelle</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </Demo>

      <Demo label="Popover">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">Ouvrir le popover</Button>
          </PopoverTrigger>
          <PopoverContent>
            <PopoverHeader>
              <PopoverTitle>Filtres rapides</PopoverTitle>
              <PopoverDescription>
                Affinez la liste des deals affichés.
              </PopoverDescription>
            </PopoverHeader>
          </PopoverContent>
        </Popover>
      </Demo>

      <Demo label="DropdownMenu">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">Actions</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Deal</DropdownMenuLabel>
            <DropdownMenuItem>
              <Settings strokeWidth={1.5} />
              Modifier
            </DropdownMenuItem>
            <DropdownMenuItem>
              <ArrowRight strokeWidth={1.5} />
              Changer d&apos;étape
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">
              <Trash2 strokeWidth={1.5} />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Demo>

      <Demo label="Dialog">
        <Dialog>
          <DialogTrigger asChild>
            <Button>Nouveau deal</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un deal</DialogTitle>
              <DialogDescription>
                Renseignez les informations de l&apos;opportunité.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <Input placeholder="Nom du deal" />
              <Input type="number" placeholder="Montant (€)" />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost">Annuler</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button>Créer</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Demo>

      <Demo label="Sheet">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">Ouvrir le panneau</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Détails du deal</SheetTitle>
              <SheetDescription>
                Édition inline depuis le panneau latéral.
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-3 px-4">
              <Input placeholder="Nom du deal" defaultValue="Refonte ERP" />
              <Textarea placeholder="Notes internes…" rows={4} />
            </div>
            <SheetFooter>
              <SheetClose asChild>
                <Button>Enregistrer</Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </Demo>

      <Demo label="Command">
        <Command className="w-80 border border-border-subtle">
          <CommandInput placeholder="Rechercher une commande…" />
          <CommandList>
            <CommandEmpty>Aucun résultat.</CommandEmpty>
            <CommandGroup heading="Navigation">
              <CommandItem>
                <ArrowRight strokeWidth={1.5} />
                Aller au dashboard
              </CommandItem>
              <CommandItem>
                <Plus strokeWidth={1.5} />
                Créer un deal
              </CommandItem>
              <CommandItem>
                <Settings strokeWidth={1.5} />
                Ouvrir les paramètres
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </Demo>

      {/*
       * SubmitButton — convention non négociable pour toutes les mutations
       * tRPC. Empêche le double-submit, signale clairement l'attente côté UX.
       * À utiliser systématiquement à la place d'un <Button> nu pour toute
       * action qui déclenche une mutation.
       */}
      <Demo label="SubmitButton">
        <p className="w-full text-sm text-text-secondary">
          À utiliser pour TOUTE mutation tRPC. Convention non négociable Modulo
          — empêche le double-submit, signale clairement l&apos;attente côté
          UX.
        </p>

        {/* État default */}
        <SubmitButton>Enregistrer</SubmitButton>

        {/* isLoading avec loadingLabel : swap du label */}
        <SubmitButton isLoading loadingLabel="Création en cours…">
          Créer
        </SubmitButton>

        {/* isLoading sans loadingLabel : spinner ajouté, children conservés */}
        <SubmitButton isLoading>Enregistrer</SubmitButton>

        {/* variant destructive + isLoading */}
        <SubmitButton
          variant="destructive"
          isLoading
          loadingLabel="Suppression en cours…"
        >
          Supprimer
        </SubmitButton>

        {/* variant outline + isLoading sans loadingLabel */}
        <SubmitButton variant="outline" isLoading>
          Annuler
        </SubmitButton>
      </Demo>

      <Demo label="Installés · démo à venir">
        <Badge variant="outline">sonner (toasts)</Badge>
      </Demo>
    </div>
  );
}
