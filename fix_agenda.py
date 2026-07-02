import re

path = 'src/pages/Agenda.tsx'
with open(path, 'r') as f:
    c = f.read()

# 1. newAppService -> newAppServices
c = c.replace('const [newAppService, setNewAppService] = useState<any>(null);', 'const [newAppServices, setNewAppServices] = useState<any[]>([]);')
c = c.replace('queryKey: [\'available-times\', newAppBarber?.id, selectedDate, newAppService?.id],', 'queryKey: [\'available-times\', newAppBarber?.id, selectedDate, newAppServices.map(s => s.id).join(\',\')],')
c = c.replace('if (!newAppBarber || !selectedDate || !newAppService) return [];', 'if (!newAppBarber || !selectedDate || newAppServices.length === 0) return [];')
c = c.replace('const res = await api.get<string[]>(`/users/${newAppBarber.id}/available_times/?date=${dateStr}&service_id=${newAppService.id}`);', 'const res = await api.get<string[]>(`/users/${newAppBarber.id}/available_times/?date=${dateStr}&services_ids=${newAppServices.map(s => s.id).join(\',\')}`);')
c = c.replace('enabled: !!newAppBarber && !!selectedDate && !!newAppService && showNewAppointmentModal,', 'enabled: !!newAppBarber && !!selectedDate && newAppServices.length > 0 && showNewAppointmentModal,')

c = c.replace('if (!newAppBarber || !newAppService || !newAppTime || dates.length === 0) return;', 'if (!newAppBarber || newAppServices.length === 0 || !newAppTime || dates.length === 0) return;')
c = c.replace('service_id: newAppService.id,', 'services_ids: newAppServices.map(s => s.id),')
c = c.replace('if (!selectedDate || !newAppTime || !newAppService || !newAppClient || !newAppBarber) return;', 'if (!selectedDate || !newAppTime || newAppServices.length === 0 || !newAppClient || !newAppBarber) return;')

c = c.replace('service: newAppService.id,', 'services: newAppServices.map(s => s.id),')
c = c.replace('total_price: newAppService.price,', 'total_price: newAppServices.reduce((a,b) => a + Number(b.price), 0),')

c = c.replace('newAppBarber && newAppService && (', 'newAppBarber && newAppServices.length > 0 && (')
c = c.replace('!newAppClient || !newAppService || !newAppBarber || !newAppTime || createAppointmentMutation.isPending', '!newAppClient || newAppServices.length === 0 || !newAppBarber || !newAppTime || createAppointmentMutation.isPending')

# 2. editService -> editServices
c = c.replace('const [editService, setEditService] = useState<any>(null);', 'const [editServices, setEditServices] = useState<any[]>([]);')
c = c.replace('const srv = services?.find((s: any) => s.id === app.service || s.name === app.service_name);', 'const srv = services?.filter((s: any) => app.services?.includes(s.id)) || [];')
c = c.replace('if (srv) setEditService(srv);', 'if (srv.length > 0) setEditServices(srv);')
c = c.replace('service: editService.id,', 'services: editServices.map(s => s.id),')
c = c.replace('total_price: editService.price,', 'total_price: editServices.reduce((a,b) => a + Number(b.price), 0),')
c = c.replace('!editService || !editTime', 'editServices.length === 0 || !editTime')
c = c.replace('editService?.id?.toString()', 'editServices[0]?.id?.toString()') # Temp fix for UI

# 3. walkInService -> walkInServices
c = c.replace('const [walkInService, setWalkInService] = useState<any>(null);', 'const [walkInServices, setWalkInServices] = useState<any[]>([]);')
c = c.replace('const service = services?.find((s: any) => s.id === entry.service);', 'const srv = services?.filter((s: any) => entry.services?.includes(s.id)) || [];')
c = c.replace('if (service) setWalkInService(service);', 'if (srv.length > 0) setWalkInServices(srv);')
c = c.replace('service_id: walkInService.id,', 'services_ids: walkInServices.map(s => s.id),')
c = c.replace('service: walkInService.id,', 'services: walkInServices.map(s => s.id),')
c = c.replace('total_price: walkInService.price,', 'total_price: walkInServices.reduce((a,b) => a + Number(b.price), 0),')
c = c.replace('if (!walkInClient || !walkInService || !walkInBarber || !walkInTime) return;', 'if (!walkInClient || walkInServices.length === 0 || !walkInBarber || !walkInTime) return;')
c = c.replace('walkInBarber && walkInService && (', 'walkInBarber && walkInServices.length > 0 && (')
c = c.replace('walkInService?.id?.toString()', 'walkInServices[0]?.id?.toString()') # Temp fix for UI
c = c.replace('!walkInClient || !walkInService || !walkInBarber || !walkInTime || createWalkInMutation.isPending', '!walkInClient || walkInServices.length === 0 || !walkInBarber || !walkInTime || createWalkInMutation.isPending')


with open(path, 'w') as f:
    f.write(c)

