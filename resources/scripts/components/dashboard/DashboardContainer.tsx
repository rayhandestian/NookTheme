import React, { useEffect, useState, useCallback } from 'react';
import debounce from 'debounce';
import { Server } from '@/api/server/getServer';
import getServers from '@/api/getServers';
import ServerRow from '@/components/dashboard/ServerRow';
import Spinner from '@/components/elements/Spinner';
import PageContentBlock from '@/components/elements/PageContentBlock';
import useFlash from '@/plugins/useFlash';
import { useStoreState } from 'easy-peasy';
import { usePersistedState } from '@/plugins/usePersistedState';
import Switch from '@/components/elements/Switch';
import tw from 'twin.macro';
import useSWR from 'swr';
import { PaginatedResult } from '@/api/http';
import Pagination from '@/components/elements/Pagination';
import { useLocation } from 'react-router-dom';
import Input from '@/components/elements/Input';
import Label from '@/components/elements/Label';
import Select from '@/components/elements/Select';

export default () => {
    const { search } = useLocation();
    const defaultPage = Number(new URLSearchParams(search).get('page') || '1');

    const [page, setPage] = useState(!isNaN(defaultPage) && defaultPage > 0 ? defaultPage : 1);
    const { clearFlashes, clearAndAddHttpError } = useFlash();
    const uuid = useStoreState((state) => state.user.data!.uuid);
    const rootAdmin = useStoreState((state) => state.user.data!.rootAdmin);
    const [showOnlyAdmin, setShowOnlyAdmin] = usePersistedState(`${uuid}:show_all_servers`, false);

    const [searchQuery, setSearchQuery] = useState('');
    const [sort, setSort] = useState('');

    const { data: servers, error } = useSWR<PaginatedResult<Server>>(
        ['/api/client/servers', showOnlyAdmin && rootAdmin, page, searchQuery, sort],
        () =>
            getServers({
                page,
                query: searchQuery,
                sort,
                type: showOnlyAdmin && rootAdmin ? 'admin' : undefined,
            })
    );

    useEffect(() => {
        if (!servers) return;
        if (servers.pagination.currentPage > 1 && !servers.items.length) {
            setPage(1);
        }
    }, [servers?.pagination.currentPage]);

    useEffect(() => {
        // Don't use react-router to handle changing this part of the URL, otherwise it
        // triggers a needless re-render. We just want to track this in the URL incase the
        // user refreshes the page.
        window.history.replaceState(null, document.title, `/${page <= 1 ? '' : `?page=${page}`}`);
    }, [page]);

    useEffect(() => {
        if (error) clearAndAddHttpError({ key: 'dashboard', error });
        if (!error) clearFlashes('dashboard');
    }, [error]);

    const setQuery = useCallback(
        debounce((value: string) => {
            setPage(1);
            setSearchQuery(value);
        }, 500),
        []
    );

    return (
        <PageContentBlock className='content-dashboard' title={'Dashboard'} showFlashKey={'dashboard'}>
            <div css={tw`mb-4 flex flex-col md:flex-row justify-between items-end md:items-center`}>
                <div css={tw`w-full md:w-auto flex flex-col md:flex-row gap-4`}>
                    <div css={tw`flex-1 md:w-64`}>
                        <Label>Search</Label>
                        <Input
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={'Search for a server...'}
                        />
                    </div>
                    <div css={tw`flex-1 md:w-64`}>
                        <Label>Sort By</Label>
                        <Select onChange={(e) => setSort(e.target.value)}>
                            <option value={''}>Default (Name A-Z)</option>
                            <option value={'-name'}>Name (Z-A)</option>
                            <option value={'memory'}>Memory (Low-High)</option>
                            <option value={'-memory'}>Memory (High-Low)</option>
                            <option value={'cpu'}>CPU (Low-High)</option>
                            <option value={'-cpu'}>CPU (High-Low)</option>
                            <option value={'-created_at'}>Date Created (Newest)</option>
                            <option value={'created_at'}>Date Created (Oldest)</option>
                        </Select>
                    </div>
                </div>
                {rootAdmin && (
                    <div css={tw`flex justify-end items-center mt-4 md:mt-0`}>
                        <p css={tw`uppercase text-xs text-neutral-400 mr-2`}>
                            {showOnlyAdmin ? "Showing others' servers" : 'Showing your servers'}
                        </p>
                        <Switch
                            name={'show_all_servers'}
                            defaultChecked={showOnlyAdmin}
                            onChange={() => setShowOnlyAdmin((s) => !s)}
                        />
                    </div>
                )}
            </div>
            {!servers ? (
                <Spinner centered size={'large'} />
            ) : (
                <Pagination data={servers} onPageSelect={setPage}>
                    {({ items }) =>
                        items.length > 0 ? (
                            items.map((server, index) => (
                                <ServerRow key={server.uuid} server={server} css={index > 0 ? tw`mt-2` : undefined} />
                            ))
                        ) : (
                            <p css={tw`text-center text-sm text-neutral-400`}>
                                {showOnlyAdmin
                                    ? 'There are no other servers to display.'
                                    : 'There are no servers associated with your account.'}
                            </p>
                        )
                    }
                </Pagination>
            )}
        </PageContentBlock>
    );
};
