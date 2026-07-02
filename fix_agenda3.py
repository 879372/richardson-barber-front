import re

path = 'src/pages/Agenda.tsx'
with open(path, 'r') as f:
    c = f.read()

c = c.replace('setEditService(srv);', 'setEditServices(srv);')
c = c.replace('if (walkInService)', 'if (walkInServices.length > 0)')
c = c.replace('if (!walkInService)', 'if (walkInServices.length === 0)')
c = c.replace('item.service)', 'item.services?.includes(s.id))')
c = c.replace('editService?.id?.toString()', 'editServices[0]?.id?.toString()')
c = c.replace('editService?.name', 'editServices.map(s => s.name).join(\', \')')
c = c.replace('editService?.price', 'editServices.reduce((a,b)=>a+Number(b.price),0)')
c = c.replace('!editService', 'editServices.length === 0')
c = c.replace('editService?.', 'editServices[0]?.')

c = c.replace('walkInService?.name', 'walkInServices.map(s => s.name).join(\', \')')
c = c.replace('walkInService?.price', 'walkInServices.reduce((a,b)=>a+Number(b.price),0)')
c = c.replace('walkInService?.id?.toString()', 'walkInServices[0]?.id?.toString()')
c = c.replace('!walkInService', 'walkInServices.length === 0')
c = c.replace('walkInService?.', 'walkInServices[0]?.')

with open(path, 'w') as f:
    f.write(c)

