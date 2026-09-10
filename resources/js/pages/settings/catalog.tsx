import { Form, Head } from '@inertiajs/react';
import { MessageCircle } from 'lucide-react';
import CatalogSettingsController from '@/actions/App/Http/Controllers/Settings/CatalogSettingsController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { edit } from '@/routes/catalog-settings';

export default function CatalogSettings({
    whatsappNumber,
}: {
    whatsappNumber: string | null;
}) {
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
                                    defaultValue={whatsappNumber ?? ''}
                                    placeholder="Ex.: 55 11 99999-9999"
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
