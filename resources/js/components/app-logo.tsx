export default function AppLogo() {
    return (
        <div className="flex min-w-0 flex-1 items-center">
            <img
                src="/images/brand/logo-cronicas-color.png"
                alt="Crônicas Jeans"
                className="h-9 w-auto max-w-full object-contain group-data-[collapsible=icon]/sidebar-wrapper:h-7 group-data-[collapsible=icon]/sidebar-wrapper:w-7 group-data-[collapsible=icon]/sidebar-wrapper:object-cover group-data-[collapsible=icon]/sidebar-wrapper:object-left dark:hidden"
            />
            <img
                src="/images/brand/logo-cronicas-white.png"
                alt="Crônicas Jeans"
                className="hidden h-9 w-auto max-w-full object-contain group-data-[collapsible=icon]/sidebar-wrapper:h-7 group-data-[collapsible=icon]/sidebar-wrapper:w-7 group-data-[collapsible=icon]/sidebar-wrapper:object-cover group-data-[collapsible=icon]/sidebar-wrapper:object-left dark:block"
            />
        </div>
    );
}
