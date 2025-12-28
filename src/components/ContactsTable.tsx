import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Mail, Linkedin, Phone, Search, Filter, Plus, MoreHorizontal, Pencil, Trash2, ExternalLink, UserSearch, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Contact {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  role_category: string | null;
  priority_level: number | null;
  is_primary_contact: boolean | null;
  source: string | null;
  created_at: string;
}

interface ContactsTableProps {
  contacts: Contact[];
  entityType: 'pe_firm' | 'platform';
  entityId: string;
  entityName: string;
  onContactsChange: () => void;
  showDiscoverButton?: boolean;
  onDiscover?: () => void;
  isDiscovering?: boolean;
}

export function ContactsTable({ 
  contacts, 
  entityType, 
  entityId, 
  entityName,
  onContactsChange,
  showDiscoverButton = false,
  onDiscover,
  isDiscovering = false
}: ContactsTableProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    title: "",
    email: "",
    phone: "",
    linkedin_url: "",
    role_category: "other",
    priority_level: 3,
    is_primary_contact: false
  });

  const tableName = entityType === 'pe_firm' ? 'pe_firm_contacts' : 'platform_contacts';
  const foreignKey = entityType === 'pe_firm' ? 'pe_firm_id' : 'platform_id';

  const roleOptions = [
    { value: "executive", label: "Executive" },
    { value: "junior_investment", label: "VP / Associate" },
    { value: "business_dev", label: "Business Dev" },
    { value: "deal_team", label: "Deal Team" },
    { value: "corp_dev", label: "Corp Dev" },
    { value: "operations", label: "Operations" },
    { value: "other", label: "Other" }
  ];

  const getPriorityBadge = (priority: number | null) => {
    if (!priority) return null;
    if (priority <= 2) return <Badge className="bg-green-500/20 text-green-600 border-green-500/30 text-[10px]">High</Badge>;
    if (priority === 3) return <Badge variant="secondary" className="text-[10px]">Medium</Badge>;
    return <Badge variant="outline" className="text-muted-foreground text-[10px]">Lower</Badge>;
  };

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = search === "" || 
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.title?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || c.role_category === roleFilter;
    return matchesSearch && matchesRole;
  }).sort((a, b) => (a.priority_level || 99) - (b.priority_level || 99));

  const openEditDialog = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      title: contact.title || "",
      email: contact.email || "",
      phone: contact.phone || "",
      linkedin_url: contact.linkedin_url || "",
      role_category: contact.role_category || "other",
      priority_level: contact.priority_level || 3,
      is_primary_contact: contact.is_primary_contact || false
    });
    setEditDialogOpen(true);
  };

  const openAddDialog = () => {
    setFormData({
      name: "",
      title: "",
      email: "",
      phone: "",
      linkedin_url: "",
      role_category: "other",
      priority_level: 3,
      is_primary_contact: false
    });
    setAddDialogOpen(true);
  };

  const handleSaveContact = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }

    if (editingContact) {
      const { error } = await supabase
        .from(tableName)
        .update({
          name: formData.name,
          title: formData.title || null,
          email: formData.email || null,
          phone: formData.phone || null,
          linkedin_url: formData.linkedin_url || null,
          role_category: formData.role_category,
          priority_level: formData.priority_level,
          is_primary_contact: formData.is_primary_contact
        })
        .eq('id', editingContact.id);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Contact updated" });
    } else {
      const insertData: Record<string, unknown> = {
        name: formData.name,
        title: formData.title || null,
        email: formData.email || null,
        phone: formData.phone || null,
        linkedin_url: formData.linkedin_url || null,
        role_category: formData.role_category,
        priority_level: formData.priority_level,
        is_primary_contact: formData.is_primary_contact,
        source: 'manual'
      };
      insertData[foreignKey] = entityId;

      const { error } = await supabase
        .from(tableName)
        .insert(insertData as any);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Contact added" });
    }

    setEditDialogOpen(false);
    setAddDialogOpen(false);
    setEditingContact(null);
    onContactsChange();
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm("Delete this contact?")) return;
    
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', contactId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Contact deleted" });
    onContactsChange();
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search contacts..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {roleOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        {showDiscoverButton && onDiscover && (
          <Button variant="outline" onClick={onDiscover} disabled={isDiscovering}>
            {isDiscovering ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserSearch className="w-4 h-4 mr-2" />}
            {isDiscovering ? "Searching..." : "Find Contacts"}
          </Button>
        )}
        <Button onClick={openAddDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Add Contact
        </Button>
      </div>

      {/* Table */}
      {filteredContacts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg bg-muted/30">
          {contacts.length === 0 ? (
            <p>No contacts yet. Click "Add Contact" or "Find Contacts" to get started.</p>
          ) : (
            <p>No contacts match your search.</p>
          )}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{contact.name}</span>
                      {contact.is_primary_contact && (
                        <Badge variant="default" className="text-[10px]">Primary</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{contact.title || "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} className="text-muted-foreground hover:text-primary">
                          <Mail className="w-4 h-4" />
                        </a>
                      )}
                      {contact.phone && (
                        <a href={`tel:${contact.phone}`} className="text-muted-foreground hover:text-primary">
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                      {contact.linkedin_url && (
                        <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-[#0077b5]">
                          <Linkedin className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize text-[10px]">
                      {contact.role_category?.replace(/_/g, ' ') || 'other'}
                    </Badge>
                  </TableCell>
                  <TableCell>{getPriorityBadge(contact.priority_level)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(contact)}>
                          <Pencil className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteContact(contact.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={editDialogOpen || addDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setEditDialogOpen(false);
          setAddDialogOpen(false);
          setEditingContact(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingContact ? "Edit Contact" : "Add Contact"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Smith"
                />
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input 
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Vice President"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input 
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>LinkedIn URL</Label>
              <Input 
                value={formData.linkedin_url}
                onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                placeholder="https://linkedin.com/in/johnsmith"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role Category</Label>
                <Select 
                  value={formData.role_category}
                  onValueChange={(val) => setFormData({ ...formData, role_category: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority (1=Highest, 4=Lowest)</Label>
                <Select 
                  value={formData.priority_level.toString()}
                  onValueChange={(val) => setFormData({ ...formData, priority_level: parseInt(val) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Deal Team</SelectItem>
                    <SelectItem value="2">2 - High Priority</SelectItem>
                    <SelectItem value="3">3 - Medium</SelectItem>
                    <SelectItem value="4">4 - Lower</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setEditDialogOpen(false);
              setAddDialogOpen(false);
              setEditingContact(null);
            }}>Cancel</Button>
            <Button onClick={handleSaveContact}>
              {editingContact ? "Save Changes" : "Add Contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
