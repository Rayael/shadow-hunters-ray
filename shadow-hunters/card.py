# card.py
# Implements the Card object.

class Card:
    """A Card of any type."""

    def __init__(self, title, desc, color, holder, is_equip, use, resource_id=None):
        self.title = title
        self.desc = desc
        self.color = color
        self.holder = holder
        self.is_equipment = is_equip
        self.use = use
        self.resource_id = resource_id or title.lower().replace(' ', '').replace('-', '')

    def dump(self):
        return {
            'title': self.title,
            'desc': self.desc,
            'color': self.color.name,
            'is_equip': self.is_equipment,
            'resource_id': self.resource_id
        }
# card.py
