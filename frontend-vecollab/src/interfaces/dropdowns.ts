export type DropdownList = {
    veInterests: SelectOption[];
    veGoals: SelectOption[];
    preferredFormat: SelectOption[];
    expertise: SelectOption[];
};

type SelectOption = {
    value: string;
    label: string;
};