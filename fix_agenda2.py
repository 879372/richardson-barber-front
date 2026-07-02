import re

path = 'src/pages/Agenda.tsx'
with open(path, 'r') as f:
    c = f.read()

# Fix WaitlistEntry / Appointment interfaces
c = c.replace('service: number | null;', 'services: number[];')
c = c.replace('service?: number | any;', 'services?: number[] | any[];')

# Fix setNewAppService -> setNewAppServices
c = c.replace('setNewAppService(null);', 'setNewAppServices([]);')
c = c.replace('onValueChange={(val) => setNewAppService(services?.find(s => s.id.toString() === val))}', 'onValueChange={(val) => setNewAppServices(services?.filter(s => s.id.toString() === val) || [])}')
c = c.replace('value={newAppService?.id?.toString()}', 'value={newAppServices[0]?.id?.toString()}')

# Fix setEditService -> setEditServices
c = c.replace('setEditService(null);', 'setEditServices([]);')
c = c.replace('onValueChange={(val) => setEditService(services?.find((s: any) => s.id.toString() === val))}', 'onValueChange={(val) => setEditServices(services?.filter((s: any) => s.id.toString() === val) || [])}')
c = c.replace('editService?.duration_minutes', 'editServices[0]?.duration_minutes')
c = c.replace('editService?.name', 'editServices.map((s: any) => s.name).join(\', \')')

# Fix setWalkInService -> setWalkInServices
c = c.replace('setWalkInService(null);', 'setWalkInServices([]);')
c = c.replace('const s = services?.find(x => x.id.toString() === val);\n                  if (s) setWalkInService(s);', 'const s = services?.filter((x: any) => x.id.toString() === val) || [];\n                  if (s.length > 0) setWalkInServices(s);')
c = c.replace('walkInService?.name', 'walkInServices.map((s: any) => s.name).join(\', \')')
c = c.replace('walkInService?.duration_minutes', 'walkInServices[0]?.duration_minutes')

with open(path, 'w') as f:
    f.write(c)
