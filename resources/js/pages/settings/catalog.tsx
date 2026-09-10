import { Form, Head } from '@inertiajs/react';
import { MessageCircle } from 'lucide-react';
import { useState } from 'react';
import CatalogSettingsController from '@/actions/App/Http/Controllers/Settings/CatalogSettingsController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { edit } from '@/routes/catalog-settings';

function onlyDigits(value: string): string {
    return value.replace(/\D/g, '');
}

function formatNationalPhoneNumber(value: string): string {
    const areaCode = value.slice(0, 2);
    const phone = value.slice(2);

    if (areaCode.length === 0) {
        return '';
    }

    if (areaCode.length === 1) {
        return `(${areaCode}`;
    }

    if (phone.length === 0) {
        return `(${areaCode})`;
    }

    if (phone.length <= 4) {
        return `(${areaCode}) ${phone}`;
    }

    if (phone.length <= 8) {
        return `(${areaCode}) ${phone.slice(0, 4)}-${phone.slice(4)}`;
    }

    return `(${areaCode}) ${phone.slice(0, 5)}-${phone.slice(5, 9)}`;
}

function formatWhatsAppNumber(value: string): string {
    const digits = onlyDigits(value);
    const hasCountryCode =
        value.trim().startsWith('+55') ||
        (digits.startsWith('55') && digits.length > 11);
    const nationalNumber = hasCountryCode
        ? digits.slice(2, 13)
        : digits.slice(0, 11);
    const formattedNationalNumber = formatNationalPhoneNumber(nationalNumber);

    if (!hasCountryCode) {
        return formattedNationalNumber;
    }

    if (formattedNationalNumber === '') {
        return '+55';
    }

    return `+55 ${formattedNationalNumber}`;
}

export default function CatalogSettings({
    whatsappNumber,
}: {
    whatsappNumber: string | null;
}) {
    const [formattedWhatsAppNumber, setFormattedWhatsAppNumber] = useState(
        formatWhatsAppNumber(whatsappNumber ?? ''),
    );

    return (
        <>
            <Head title="Configurações do catálogo" />
            <h1 className="sr-only">Configurações do catálogo</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Pedidos do catálogo"
                    description="Defina o WhatsApp que receberá os pedidos enviados pelas lojistas."
                />

                <Form
                    {...CatalogSettingsController.update.form()}
                    options={{ preserveScroll: true }}
                    className="grid gap-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="whatsapp-number">
                                    WhatsApp para pedidos
                                </Label>
                                <Input
                                    id="whatsapp-number"
                                    name="whatsapp_number"
                                    type="tel"
                                    inputMode="tel"
                                    autoComplete="tel"
                                    value={formattedWhatsAppNumber}
                                    onInput={(event) =>
                                        setFormattedWhatsAppNumber(
                                            formatWhatsAppNumber(
                                                event.currentTarget.value,
                                            ),
                                        )
                                    }
                                    placeholder="Ex.: (11) 99999-9999"
                                    required
                                    aria-invalid={
                                        errors.whatsapp_number
                                            ? true
                                            : undefined
                                    }
                                />
                                <p className="text-sm leading-6 text-muted-foreground">
                                    Informe o DDD e o telefone. O sistema
                                    adiciona o DDI 55 e remove espaços e
                                    pontuação ao salvar.
                                </p>
                                <InputError message={errors.whatsapp_number} />
                            </div>

                            <Button disabled={processing} className="w-fit">
                                <MessageCircle />
                                {processing ? 'Salvando...' : 'Salvar WhatsApp'}
                            </Button>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}

CatalogSettings.layout = {
    breadcrumbs: [
        {
            title: 'Configurações do catálogo',
            href: edit(),
        },
    ],
};
