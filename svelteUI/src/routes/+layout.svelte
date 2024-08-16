<script>
	import '../app.pcss';
	import {logout} from '../services/authservice.js'
	import BoxesIcon from '../components/Icons/BoxesIcon.svelte';
	import ChartIcon from '../components/Icons/ChartIcon.svelte';
</script>

<nav
	class="fixed top-0 z-50 w-full border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
>
	<div class="px-3 py-3 lg:px-5 lg:pl-3">
		<div class="flex items-center justify-between">
			<div class="flex items-center justify-start">
				<button
					data-drawer-target="logo-sidebar"
					data-drawer-toggle="logo-sidebar"
					aria-controls="logo-sidebar"
					type="button"
					class="inline-flex items-center rounded-lg p-2 text-sm text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600 sm:hidden"
				>
					<span class="sr-only">Open sidebar</span>
					<svg
						class="h-6 w-6"
						aria-hidden="true"
						fill="currentColor"
						viewBox="0 0 20 20"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							clip-rule="evenodd"
							fill-rule="evenodd"
							d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z"
						></path>
					</svg>
				</button>
				<a href="/" class="ml-3 flex md:mr-24">
					<img src="/favicon.jpeg" class="mr-2 h-10 w-10 rounded-full" alt="FlowBite Logo" />
					<span
						class="self-center whitespace-nowrap text-xl font-semibold dark:text-white sm:text-2xl"
						>BudgetBlade</span
					>
				</a>
			</div>
			<div class="flex items-center">
				<div class="ml-3 flex items-center">
					<div>
						<button
							type="button"
							class="flex rounded-full bg-gray-800 text-sm focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-600"
							aria-expanded="false"
							data-dropdown-toggle="dropdown-user"
						>
							<span class="sr-only">Open user menu</span>
							<!-- svelte-ignore a11y-img-redundant-alt -->
							<img
								class="h-8 w-8 rounded-full"
								src="https://flowbite.com/docs/images/people/profile-picture-5.jpg"
								alt="user photo"
							/>
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</nav>
<aside
	id="logo-sidebar"
	class="fixed left-0 top-0 z-40 h-screen w-64 -translate-x-full border-r border-gray-200 bg-white pt-20 transition-transform dark:border-gray-700 dark:bg-gray-800 sm:translate-x-0"
	aria-label="Sidebar"
>
	<div class="h-full overflow-y-auto bg-white px-3 pb-4 dark:bg-gray-800">
		<ul class="space-y-2 font-medium">
			<li>
				<a
					href="/"
					class="group flex items-center rounded-lg p-2 text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
				>
					<ChartIcon/>
					<span class="ml-3">Inicio</span>
				</a>
			</li>
			<li>
				<a
					href="/tilltypes"
					class="group flex items-center rounded-lg p-2 text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
				>
					<BoxesIcon/>
					<span class="ml-3 flex-1 whitespace-nowrap">Tipos de Cajas</span>
				</a>
			</li>
			<li>
				<a
					href="/accountplans"
					class="group flex items-center rounded-lg p-2 text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
				>
					<BoxesIcon/>
					<span class="ml-3 flex-1 whitespace-nowrap">Planes de cuentas</span>
				</a>
			</li>
			<li>
				<a
					href="/persontypes"
					class="group flex items-center rounded-lg p-2 text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
				>
					<BoxesIcon/>
					<span class="ml-3 flex-1 whitespace-nowrap">Tipo de Personas</span>
				</a>
			</li>
			<li>
				<a
					href="/persons"
					class="group flex items-center rounded-lg p-2 text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
				>
					<BoxesIcon/>
					<span class="ml-3 flex-1 whitespace-nowrap">Personas</span>
				</a>
			</li>
			<li>
				<a
					href="/tills"
					class="group flex items-center rounded-lg p-2 text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
				>
					<BoxesIcon/>
					<span class="ml-3 flex-1 whitespace-nowrap">Cajas</span>
				</a>
			</li>
			<li>
				<span class="group flex items-center rounded-lg p-2 text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700">
					<BoxesIcon/>
					<!-- svelte-ignore a11y-click-events-have-key-events -->
					<!-- svelte-ignore a11y-no-static-element-interactions -->
					<span class="ml-3 flex-1 whitespace-nowrap" on:click={()=>logout()}>Salir</span>
				</span>
			</li>
		</ul>
	</div>
</aside>

<div class="p-4 sm:ml-64">
	<div class="mt-14 rounded-lg border-0 p-4 dark:border-gray-700">
		<slot />
	</div>
</div>
